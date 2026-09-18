import { useEffect, useState } from 'react';
import { useSession } from '../sessionContext';
import { api, type CareDropType } from '../api/client';
import { shortenAddress } from '../lib/luna';

export function HomeScreen({
  onSendType,
  onOpenLoop,
  onLoopsLoaded,
}: {
  onSendType: (type: CareDropType['type']) => void;
  onOpenLoop: (pairId: string) => void;
  onLoopsLoaded: (loops: any[]) => void;
}) {
  const { address, sessionToken } = useSession();
  const [loops, setLoops] = useState<any[] | null>(null);
  const [types, setTypes] = useState<CareDropType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionToken) return;
    api
      .myLoops(sessionToken)
      .then((res) => {
        setLoops(res.pairs);
        onLoopsLoaded(res.pairs);
      })
      .catch((err) => setError(err.message));
    api.careDropTypes().then((res) => setTypes(res.types));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  return (
    <div className="screen">
      <header className="app-header">
        <span className="wallet-chip">{address ? shortenAddress(address) : ''}</span>
      </header>

      <h1>Make their day.</h1>
      <p className="subtitle">Send a moment, not just money.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <p className="eyebrow">PICK A MOMENT</p>
      <div className="type-grid">
        {types.map((t) => (
          <button key={t.type} className="type-card" onClick={() => onSendType(t.type)}>
            <span className="type-card-emoji">{t.emoji}</span>
            <span className="type-card-title">{t.cardTitle}</span>
          </button>
        ))}
      </div>

      <h2 className="section-title">Your Loops</h2>
      {loops === null && !error && <p className="hint">Loading…</p>}
      {loops && loops.length === 0 && (
        <p className="empty-state">No moments yet — send your first CareDrop above.</p>
      )}
      {loops && loops.length > 0 && (
        <div className="loop-list">
          {loops.map((l) => {
            const other = l.member_a_wallet === address ? l.member_b_wallet : l.member_a_wallet;
            return (
              <button key={l.id} className="loop-card" onClick={() => onOpenLoop(l.id)}>
                <span>
                  <div className="loop-card-name">{shortenAddress(other)}</div>
                  <div className="loop-card-sub">Your moments together</div>
                </span>
                <span>→</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
