import { useEffect, useState } from 'react';
import { useSession } from '../sessionContext';
import { api } from '../api/client';
import { lunaToNim } from '../lib/luna';

const STATUS_COPY: Record<string, string> = {
  AWAITING_PAYMENT: 'Waiting for wallet approval…',
  PAYMENT_SUBMITTED: 'Broadcasting to the Nimiq network…',
  PAYMENT_VERIFIED: 'Payment verified — delivering…',
  DELIVERED: 'Delivered! Waiting for a response.',
  COMPLETED: 'Completed',
  FAILED: 'This CareDrop could not be verified.',
};

export function CareDropViewScreen({ caredropId, onBack }: { caredropId: string; onBack: () => void }) {
  const { address, sessionToken } = useSession();
  const [drop, setDrop] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await api.getCareDrop(caredropId, sessionToken);
        if (!cancelled) setDrop(res.caredrop);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load CareDrop.');
      }
    };
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [caredropId, sessionToken]);

  if (error) return <div className="screen screen-center"><div className="alert alert-error">{error}</div></div>;
  if (!drop) return <div className="screen screen-center"><p className="hint">Loading…</p></div>;

  const isRecipient = drop.recipientWallet === address;
  const isSender = drop.senderWallet === address;

  const submitResponse = async () => {
    if (!sessionToken || !responseText.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.respond(caredropId, responseText, sessionToken);
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

      {drop.status === 'COMPLETED' ? (
        <div className="reveal">
          <h1>{isRecipient ? "A note for you 💛" : 'Your CareDrop is complete'}</h1>
          <p className="reveal-note">{drop.sealedNote}</p>
          <p className="hint">{lunaToNim(drop.amountLuna)} NIM · {drop.promptText}</p>
        </div>
      ) : (
        <>
          <h1>{lunaToNim(drop.amountLuna)} NIM</h1>
          <p className="prompt-text">{drop.promptText}</p>

          {isSender && (
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

          {isRecipient && drop.sealedNoteLocked && (
            <div className="sealed-note">🔒 A private note is waiting.</div>
          )}

          {isRecipient && ['DELIVERED', 'PAYMENT_VERIFIED'].includes(drop.status) && (
            <div className="response-form">
              <label className="field-label">Your response</label>
              <textarea
                className="input"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Tell them…"
              />
              <button className="btn btn-primary" disabled={submitting || !responseText.trim()} onClick={submitResponse}>
                {submitting ? 'Sending…' : 'Complete'}
              </button>
            </div>
          )}

          {isRecipient && drop.status === 'AWAITING_PAYMENT' && (
            <p className="hint">Waiting for payment to be sent.</p>
          )}
        </>
      )}
    </div>
  );
}
