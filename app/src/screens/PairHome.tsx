import { useEffect, useState } from 'react';
import { useSession } from '../session';
import { api } from '../api/client';
import { lunaToNim, shortenAddress } from '../lib/luna';

export function PairHomeScreen({
  pairId,
  onBack,
  onSendCareDrop,
  onOpenCareDrop,
}: {
  pairId: string;
  onBack: () => void;
  onSendCareDrop: (recipientAddress: string) => void;
  onOpenCareDrop: (id: string) => void;
}) {
  const { address, sessionToken } = useSession();
  const [pair, setPair] = useState<any | null>(null);
  const [memory, setMemory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionToken) return;
    Promise.all([api.getPair(pairId, sessionToken), api.getMemory(pairId, sessionToken)])
      .then(([pairRes, memRes]) => {
        setPair(pairRes.pair);
        setMemory(memRes.memory);
      })
      .catch((err) => setError(err.message));
  }, [pairId, sessionToken]);

  if (error) return <div className="screen screen-center"><div className="alert alert-error">{error}</div></div>;
  if (!pair) return <div className="screen screen-center"><p className="hint">Loading…</p></div>;

  const recipientAddress = pair.member_a_wallet === address ? pair.member_b_wallet : pair.member_a_wallet;
  const notYetPaired = pair.status !== 'ACCEPTED';

  return (
    <div className="screen">
      <button className="btn btn-ghost btn-back" onClick={onBack}>← Home</button>
      <h1>{pair.relationship_type === 'PARTNER' ? 'Your Partner' : pair.relationship_type === 'FRIEND' ? 'Your Friend' : 'Your Family'}</h1>

      {notYetPaired ? (
        <p className="hint">Waiting for them to accept your invite…</p>
      ) : (
        <>
          <button className="btn btn-primary" onClick={() => onSendCareDrop(recipientAddress)}>
            Send a CareDrop
          </button>

          <h2 className="section-title">Memory</h2>
          {memory.length === 0 && <p className="empty-state">No memories yet — send your first CareDrop.</p>}
          <div className="memory-list">
            {memory.map((m) => (
              <button key={m.id} className="memory-card" onClick={() => onOpenCareDrop(m.id)}>
                <div>{m.prompt_text}</div>
                <div className="hint">
                  {lunaToNim(m.amount_luna)} NIM · {shortenAddress(m.sender_wallet)} → {shortenAddress(m.recipient_wallet)}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
