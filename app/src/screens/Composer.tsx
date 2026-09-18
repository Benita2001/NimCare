import { useEffect, useState } from 'react';
import { useSession } from '../sessionContext';
import { api, type CareDropType } from '../api/client';
import { nimToLuna, lunaToNim, shortenAddress } from '../lib/luna';
import { sendCareDropPayment } from '../nimiq/provider';

type Step = 'content' | 'recipient' | 'amount' | 'review' | 'sending' | 'error';

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

  const create = async () => {
    if (!sessionToken) return;
    setStep('sending');
    setError(null);
    try {
      let mediaUrl: string | undefined;
      let mediaMime: string | undefined;
      if (type === 'PHOTO' && photoFile) {
        const uploaded = await api.uploadPhoto(photoFile, sessionToken);
        mediaUrl = uploaded.url;
        mediaMime = uploaded.mime;
      }

      const amountLuna = nimToLuna(amount);
      const drop = await api.createCareDrop(
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

      const payment = await sendCareDropPayment({ recipient, amountLuna: drop.amountLuna, reference: drop.reference });
      if (!payment.ok) {
        setError(payment.message);
        setStep('error');
        return;
      }

      await api.submitPayment(drop.id, payment.value, sessionToken);
      onCreated({ shareToken: drop.shareToken, id: drop.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating your CareDrop.');
      setStep('error');
    }
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
        <button className="btn btn-primary" onClick={() => setStep('review')}>Try again</button>
        <button className="btn btn-ghost" onClick={onBack}>Cancel</button>
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
