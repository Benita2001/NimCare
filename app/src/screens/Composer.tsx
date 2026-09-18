import { useEffect, useRef, useState } from 'react';
import { useSession } from '../sessionContext';
import { api, type CareDropType } from '../api/client';
import { nimToLuna, lunaToNim, shortenAddress } from '../lib/luna';
import { sendCareDropPayment, nextAttemptId, type PaymentErrorKind } from '../nimiq/provider';
import { markStage } from '../diagnostics';

type Step = 'content' | 'recipient' | 'amount' | 'review' | 'sending' | 'error';

type CreatedDrop = { id: string; recipient: string; amountLuna: number; reference: string; shareToken: string };

type PaymentDebugInfo = {
  recipient: string;
  amountLuna: number;
  reference: string;
  referenceBytes: number;
  errorType: PaymentErrorKind;
  errorMessage: string;
};

const AMOUNT_PRESETS = ['0.1', '0.5', '1', '2'];

export function ComposerScreen({
  type,
  loops,
  presetRecipient,
  onBack,
  onCreated,
}: {
  type: CareDropType['type'];
  loops: any[];
  presetRecipient?: string;
  onBack: () => void;
  onCreated: (params: { shareToken: string; id: string }) => void;
}) {
  const { address, sessionToken } = useSession();
  const [step, setStep] = useState<Step>('content');
  const [error, setError] = useState<string | null>(null);
  const [drop, setDrop] = useState<CreatedDrop | null>(null);
  const [debugInfo, setDebugInfo] = useState<PaymentDebugInfo | null>(null);
  // Synchronous guard against a double-tap firing the handler twice before
  // React's re-render removes the button (setStep is asynchronous; a ref
  // read/write is not). See MEMORY.md 2026-09-18 timing/lifecycle
  // investigation, instruction #18/#19 — one human tap must produce
  // exactly one provider transaction request.
  const inFlightRef = useRef(false);

  // content
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [movieTitle, setMovieTitle] = useState('');

  // recipient
  const [recipientWallet, setRecipientWallet] = useState(presetRecipient ?? '');
  const [customAddress, setCustomAddress] = useState('');

  // amount
  const [amount, setAmount] = useState('0.5');

  const typeDef = useTypeDef(type);

  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const contentValid =
    type === 'PHOTO' ? Boolean(photoFile) : type === 'PLAYLIST' || type === 'MOVIE' ? true : true;

  const recipient = recipientWallet || customAddress.trim();

  /**
   * Sends payment for an already-created CareDrop. Always uses the
   * server-returned `createdDrop.recipient` — the canonical, validated
   * address @nimiq/core normalized it to — never the raw local `recipient`
   * the user typed/selected. Reusing raw client input here (rather than
   * the server's authoritative echo) was the confirmed cause of the
   * differential internal_error: a real device test proved the exact same
   * wallet/network/provider succeeds with a manually-entered address but
   * failed through this path when it reused un-canonicalized input. See
   * MEMORY.md 2026-09-18 differential hotfix.
   */
  const attemptPayment = async (createdDrop: CreatedDrop, tapStartedAt: number) => {
    if (!sessionToken) return;
    const attemptId = nextAttemptId();
    setStep('sending');
    setError(null);
    setDebugInfo(null);
    try {
      const payment = await sendCareDropPayment({
        recipient: createdDrop.recipient,
        amountLuna: createdDrop.amountLuna,
        reference: createdDrop.reference,
        attemptId,
        tapStartedAt,
      });
      if (!payment.ok) {
        setError(payment.message);
        setDebugInfo({
          recipient: createdDrop.recipient,
          amountLuna: createdDrop.amountLuna,
          reference: createdDrop.reference,
          referenceBytes: new TextEncoder().encode(createdDrop.reference).length,
          errorType: payment.kind,
          errorMessage: payment.message,
        });
        setStep('error');
        return;
      }

      await api.submitPayment(createdDrop.id, payment.value, sessionToken);
      onCreated({ shareToken: createdDrop.shareToken, id: createdDrop.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong sending your CareDrop.');
      setStep('error');
    } finally {
      inFlightRef.current = false;
    }
  };

  const create = async () => {
    if (!sessionToken || inFlightRef.current) return;
    inFlightRef.current = true;
    const tapStartedAt = performance.now();
    markStage('COMPOSER:tap:create-surprise t+0ms');
    setStep('sending');
    setError(null);
    setDebugInfo(null);
    try {
      let mediaUrl: string | undefined;
      let mediaMime: string | undefined;
      if (type === 'PHOTO' && photoFile) {
        markStage(`COMPOSER:upload:start t+${Math.round(performance.now() - tapStartedAt)}ms`);
        const uploaded = await api.uploadPhoto(photoFile, sessionToken);
        mediaUrl = uploaded.url;
        mediaMime = uploaded.mime;
        markStage(`COMPOSER:upload:done t+${Math.round(performance.now() - tapStartedAt)}ms`);
      }

      const amountLuna = nimToLuna(amount);
      markStage(`COMPOSER:caredrop-create:start t+${Math.round(performance.now() - tapStartedAt)}ms`);
      const createdDrop = await api.createCareDrop(
        {
          recipientWallet: recipient,
          type,
          title: type === 'MOVIE' ? movieTitle || undefined : typeDef?.headline,
          caption: caption || undefined,
          mediaUrl,
          mediaMime,
          externalUrl: type === 'PLAYLIST' || type === 'MOVIE' ? externalUrl || undefined : undefined,
          amountLuna,
        },
        sessionToken,
      );
      markStage(`COMPOSER:caredrop-create:done t+${Math.round(performance.now() - tapStartedAt)}ms`);
      setDrop(createdDrop);
      // inFlightRef stays true across into attemptPayment — a single
      // logical "send" spans both; attemptPayment clears it in its
      // finally block once the whole attempt (success or failure) ends.
      await attemptPayment(createdDrop, tapStartedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating your CareDrop.');
      setStep('error');
      inFlightRef.current = false;
    }
  };

  /**
   * "Try again" must never silently create a second CareDrop row for the
   * same attempt (a fresh id/reference every retry) — it retries payment
   * against the *same* already-created CareDrop. Only falls back to a
   * fresh create() when creation itself never succeeded (drop is still
   * null), since there is nothing yet to retry payment against. This is
   * always an explicit human tap — never automatic. See MEMORY.md
   * 2026-09-18 differential hotfix.
   */
  const retry = () => {
    if (inFlightRef.current) return;
    if (drop) {
      inFlightRef.current = true;
      markStage('COMPOSER:tap:try-again t+0ms');
      attemptPayment(drop, performance.now());
    } else {
      create();
    }
  };

  /**
   * TEMPORARY diagnostic action for the 2026-09-18 timing/lifecycle
   * investigation (Instruction #5, "Test D — exact failed CareDrop
   * payload replay"): a fresh direct tap that performs ONLY the provider
   * send for the already-created drop — no upload, no createCareDrop
   * call, no changes to recipient/amount/reference. Functionally this is
   * identical to `retry()` (which already only re-sends, never
   * re-creates, after the earlier differential hotfix) — it exists as a
   * separately, unambiguously labeled action so a device tester can
   * report exactly which button they pressed. Remove once the timing
   * hypothesis is proven or rejected on a real device.
   */
  const replayExactPayload = () => {
    if (inFlightRef.current || !drop) return;
    inFlightRef.current = true;
    markStage('COMPOSER:tap:replay-exact-payload t+0ms');
    attemptPayment(drop, performance.now());
  };

  if (step === 'sending') {
    return (
      <div className="screen screen-center">
        <div className="spinner" />
        <p>Waiting for your approval in Nimiq Pay…</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="screen screen-center">
        <div className="alert alert-error">
          <strong>Couldn't send it.</strong>
          <p>{error}</p>
        </div>
        <button className="btn btn-primary" onClick={retry}>Try again</button>
        <button className="btn btn-ghost" onClick={onBack}>Cancel</button>
        {drop && (
          <button className="btn btn-ghost" onClick={replayExactPayload} style={{ fontSize: 12 }}>
            Replay exact payload (diagnostic)
          </button>
        )}
        {debugInfo && (
          <details style={{ marginTop: 16, fontFamily: 'monospace', fontSize: 12 }}>
            <summary>Payload diagnostics (temporary, dev-only)</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {`Recipient:\n${debugInfo.recipient}\n\nValue:\n${debugInfo.amountLuna} Luna\n\nReference:\n${debugInfo.reference}\n\nReference bytes:\n${debugInfo.referenceBytes}\n\nError type:\n${debugInfo.errorType}\n\nError message:\n${debugInfo.errorMessage}`}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="screen">
        <button className="btn btn-ghost btn-back" onClick={() => setStep('amount')}>← Edit</button>
        <h1>Ready to send?</h1>
        <div className="review-card">
          <p><strong>{typeDef?.emoji} {typeDef?.headline}</strong></p>
          {caption && <p>{caption}</p>}
          <p><strong>To:</strong> {shortenAddress(recipient)}</p>
          <p><strong>Amount:</strong> {amount} NIM</p>
        </div>
        <p className="hint">Nimiq Pay will ask you to approve a {amount} NIM gift.</p>
        <button className="btn btn-primary" onClick={create}>Create surprise</button>
      </div>
    );
  }

  if (step === 'amount') {
    return (
      <div className="screen">
        <button className="btn btn-ghost btn-back" onClick={() => setStep(presetRecipient ? 'content' : 'recipient')}>← Back</button>
        <div className="step-dots">
          <span className="step-dot" /><span className="step-dot" /><span className="step-dot step-dot-active" />
        </div>
        <h1>Add a little something</h1>
        <div className="amount-grid">
          {AMOUNT_PRESETS.map((a) => (
            <button key={a} className={`option-pill ${amount === a ? 'option-pill-active' : ''}`} onClick={() => setAmount(a)}>
              {a} NIM
            </button>
          ))}
        </div>
        <label className="field-label">Or a custom amount (NIM)</label>
        <input className="input" type="number" min="0.00001" step="0.00001" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <p className="hint">= {amount ? lunaToNim(nimToLuna(amount || '0')) : '0'} NIM</p>
        <button className="btn btn-primary" disabled={!(Number(amount) > 0)} onClick={() => setStep('review')}>
          Continue
        </button>
      </div>
    );
  }

  if (step === 'recipient') {
    return (
      <div className="screen">
        <button className="btn btn-ghost btn-back" onClick={() => setStep('content')}>← Back</button>
        <div className="step-dots">
          <span className="step-dot" /><span className="step-dot step-dot-active" /><span className="step-dot" />
        </div>
        <h1>Who's it for?</h1>
        {loops.length > 0 && (
          <div className="loop-list">
            {loops.map((l) => {
              const other = l.member_a_wallet === address ? l.member_b_wallet : l.member_a_wallet;
              return (
                <button
                  key={l.id}
                  className={`loop-card ${recipientWallet === other ? 'option-pill-active' : ''}`}
                  onClick={() => {
                    setRecipientWallet(other);
                    setCustomAddress('');
                  }}
                >
                  <span className="loop-card-name">{shortenAddress(other)}</span>
                </button>
              );
            })}
          </div>
        )}
        <label className="field-label">Or send to a new wallet address</label>
        <input
          className="input"
          placeholder="NQ.."
          value={customAddress}
          onChange={(e) => {
            setCustomAddress(e.target.value);
            setRecipientWallet('');
          }}
        />
        <button className="btn btn-primary" disabled={!recipient} onClick={() => setStep('amount')}>
          Continue
        </button>
      </div>
    );
  }

  // content step
  return (
    <div className="screen">
      <button className="btn btn-ghost btn-back" onClick={onBack}>← Back</button>
      <div className="step-dots">
        <span className="step-dot step-dot-active" /><span className="step-dot" /><span className="step-dot" />
      </div>
      <h1>{typeDef?.emoji} {typeDef?.headline}</h1>

      {type === 'PHOTO' && (
        <label className="upload-area">
          {photoPreview ? (
            <img src={photoPreview} alt="Selected" />
          ) : (
            <>
              <span style={{ fontSize: 32 }}>📷</span>
              <span>Choose a photo</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />
        </label>
      )}

      {(type === 'PLAYLIST' || type === 'MOVIE') && (
        <>
          <label className="field-label">{type === 'PLAYLIST' ? 'Spotify, Apple Music, or YouTube link' : 'Movie link (optional)'}</label>
          <input className="input" placeholder="https://…" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
          {type === 'MOVIE' && (
            <>
              <label className="field-label">Movie title (optional)</label>
              <input className="input" placeholder="Your choice…" value={movieTitle} onChange={(e) => setMovieTitle(e.target.value)} />
            </>
          )}
        </>
      )}

      <label className="field-label">Add a note (optional)</label>
      <textarea className="input" placeholder="Pick something good." value={caption} onChange={(e) => setCaption(e.target.value)} />

      <button
        className="btn btn-primary"
        disabled={!contentValid}
        onClick={() => setStep(presetRecipient ? 'amount' : 'recipient')}
      >
        Continue
      </button>
    </div>
  );
}

function useTypeDef(type: CareDropType['type']) {
  const [types, setTypes] = useState<CareDropType[]>([]);
  useEffect(() => {
    api.careDropTypes().then((res) => setTypes(res.types));
  }, []);
  return types.find((t) => t.type === type);
}
