import { useEffect, useState } from 'react';
import { useSession } from '../sessionContext';
import { api, type CareDrop } from '../api/client';
import { lunaToNim } from '../lib/luna';

const STATUS_COPY: Record<string, string> = {
  AWAITING_PAYMENT: 'Waiting for wallet approval…',
  PAYMENT_SUBMITTED: 'Broadcasting to the Nimiq network…',
  PAYMENT_VERIFIED: 'Payment verified — delivering…',
  DELIVERED: 'Delivered! Waiting for them to open it.',
  COMPLETED: 'Completed',
  FAILED: 'This CareDrop could not be verified.',
};

const TYPE_EMOJI: Record<string, string> = { PHOTO: '📸', PLAYLIST: '🎵', MOVIE: '🍿', TREAT: '☕' };

export function CareDropScreen({
  caredropId,
  shareToken,
  onBack,
  onSendOneBack,
}: {
  caredropId?: string;
  shareToken?: string;
  onBack: () => void;
  onSendOneBack: (recipientWallet: string) => void;
}) {
  const { address, sessionToken } = useSession();
  const [drop, setDrop] = useState<CareDrop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teaserOpened, setTeaserOpened] = useState(!shareToken); // sender's own view skips the teaser
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionToken || !teaserOpened) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = shareToken
          ? await api.getCareDropByToken(shareToken, sessionToken)
          : await api.getCareDrop(caredropId!, sessionToken);
        if (!cancelled) setDrop(res.caredrop);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this CareDrop.');
      }
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [caredropId, shareToken, sessionToken, teaserOpened]);

  if (shareToken && !teaserOpened) {
    return (
      <div className="screen screen-center">
        <div className="success-icon">💌</div>
        <h1>A CareDrop found you.</h1>
        <button className="btn btn-primary" onClick={() => setTeaserOpened(true)}>Open surprise</button>
      </div>
    );
  }

  if (error) return <div className="screen screen-center"><div className="alert alert-error">{error}</div></div>;
  if (!drop) return <div className="screen screen-center"><p className="hint">Loading…</p></div>;

  const isRecipient = drop.recipientWallet === address;
  const isSender = drop.senderWallet === address;
  const isDelivered = ['DELIVERED', 'PAYMENT_VERIFIED', 'COMPLETED'].includes(drop.status);

  const submitResponse = async () => {
    if (!sessionToken || !responseText.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.respond(drop.id, responseText, sessionToken);
      setDrop(res.caredrop);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your response.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen">
      <button className="btn btn-ghost btn-back" onClick={onBack}>← Back</button>

      {isSender && !isDelivered && (
        <div className={`status-banner status-${drop.status === 'FAILED' ? 'error' : 'progress'}`}>
          {STATUS_COPY[drop.status] ?? drop.status}
          {drop.blockchainVerificationStatus === 'RPC_UNAVAILABLE' && (
            <p className="hint">Verification pending — no Nimiq RPC endpoint configured in this environment.</p>
          )}
          {drop.status === 'FAILED' && drop.failureReason && <p className="hint">{drop.failureReason}</p>}
          {drop.transactionHash && (
            <details>
              <summary>View transaction details</summary>
              <code className="tx-hash">{drop.transactionHash}</code>
            </details>
          )}
        </div>
      )}

      {isDelivered && (
        <>
          <div className="reveal-media-card">
            {drop.type === 'PHOTO' && drop.mediaUrl && <img src={drop.mediaUrl} alt="" />}
            <div className="reveal-media-body">
              <p className="reveal-headline">{TYPE_EMOJI[drop.type]} {drop.title}</p>
              {drop.caption && <p className="prompt-text">{drop.caption}</p>}
              {(drop.type === 'PLAYLIST' || drop.type === 'MOVIE') && drop.externalUrl && (
                <div className="external-card">
                  <span style={{ fontSize: 24 }}>{TYPE_EMOJI[drop.type]}</span>
                  <a href={drop.externalUrl} target="_blank" rel="noreferrer">
                    Open {drop.externalProvider ?? 'link'}
                  </a>
                </div>
              )}
              <p style={{ marginTop: 12 }}>
                <span className="gift-pill">🎁 {lunaToNim(drop.amountLuna)} NIM</span>
              </p>
            </div>
          </div>

          {isRecipient && drop.status !== 'COMPLETED' && (
            <div className="response-form">
              <label className="field-label">Say something back</label>
              <textarea className="input" value={responseText} onChange={(e) => setResponseText(e.target.value)} placeholder="Tell them…" />
              <button className="btn btn-primary" disabled={submitting || !responseText.trim()} onClick={submitResponse}>
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          )}

          {drop.status === 'COMPLETED' && isRecipient && (
            <>
              <p className="hint" style={{ textAlign: 'center' }}>Made you smile? Keep the Loop going.</p>
              <button className="btn btn-primary" onClick={() => onSendOneBack(drop.senderWallet)}>
                Send one back ↻
              </button>
            </>
          )}
        </>
      )}

      {isRecipient && !isDelivered && (
        <p className="hint">Waiting for the gift to be confirmed…</p>
      )}
    </div>
  );
}
