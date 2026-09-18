import { useEffect, useState } from 'react';
import { useSession } from '../sessionContext';
import { api } from '../api/client';
import { shortenAddress } from '../lib/luna';

const TYPE_EMOJI: Record<string, string> = { PHOTO: '📸', PLAYLIST: '🎵', MOVIE: '🍿', TREAT: '☕' };

export function LoopScreen({
  pairId,
  onBack,
  onOpenMoment,
}: {
  pairId: string;
  onBack: () => void;
  onOpenMoment: (id: string) => void;
}) {
  const { address, sessionToken } = useSession();
  const [pair, setPair] = useState<any | null>(null);
  const [moments, setMoments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionToken) return;
    Promise.all([api.getLoop(pairId, sessionToken), api.getLoopMoments(pairId, sessionToken)])
      .then(([pairRes, momentsRes]) => {
        setPair(pairRes.pair);
        setMoments(momentsRes.memory);
      })
      .catch((err) => setError(err.message));
  }, [pairId, sessionToken]);

  if (error) return <div className="screen screen-center"><div className="alert alert-error">{error}</div></div>;
  if (!pair) return <div className="screen screen-center"><p className="hint">Loading…</p></div>;

  const other = pair.member_a_wallet === address ? pair.member_b_wallet : pair.member_a_wallet;

  return (
    <div className="screen">
      <button className="btn btn-ghost btn-back" onClick={onBack}>← Home</button>
      <h1>You + {shortenAddress(other)}</h1>
      <p className="subtitle">{moments.length} moment{moments.length === 1 ? '' : 's'} together</p>

      {moments.length === 0 && <p className="empty-state">No moments yet.</p>}

      <div className="loop-list">
        {moments.map((m) => (
          <button key={m.id} className="moment-card" onClick={() => onOpenMoment(m.id)}>
            {m.media_url ? (
              <img className="moment-thumb" src={m.media_url} alt="" />
            ) : (
              <div className="moment-thumb">{TYPE_EMOJI[m.type] ?? '💛'}</div>
            )}
            <span>
              <div className="moment-title">{TYPE_EMOJI[m.type]} {m.title ?? m.caption ?? 'A moment'}</div>
              <div className="hint">{m.sender_wallet === address ? 'You sent this' : 'They sent this'}</div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
