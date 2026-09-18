import { useEffect, useState } from 'react';
import { useSession } from '../sessionContext';
import { api, type CareDropType } from '../api/client';
import { shortenAddress } from '../lib/luna';
import { EnvelopeCharacter, MusicCharacter, MovieCharacter, Sparkle, HeartAccent } from '../components/Illustrations';

const TYPE_ICON_CLASS: Record<string, string> = {
  PHOTO: 'type-card-photo',
  PLAYLIST: 'type-card-playlist',
  MOVIE: 'type-card-movie',
  TREAT: 'type-card-treat',
};

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
    <div className="screen screen-wide">
      <header className="app-header">
        <span className="app-header-logo">💌 NimCare</span>
        <span className="wallet-chip">{address ? shortenAddress(address) : ''}</span>
      </header>

      <div className="hero-shell">
        <div className="hero-cluster hero-cluster-left">
          <EnvelopeCharacter className="hero-char hero-char-main" />
          <Sparkle className="hero-accent hero-accent-a" />
          <HeartAccent className="hero-accent hero-accent-b" />
        </div>

        <div className="hero-center">
          <div className="hero-mobile-char"><EnvelopeCharacter className="hero-char" /></div>
          <h1>Make their day.</h1>
          <p className="subtitle">Send a moment, not just money.</p>
        </div>

        <div className="hero-cluster hero-cluster-right">
          <MusicCharacter className="hero-char hero-char-secondary" />
          <MovieCharacter className="hero-char hero-char-tertiary" />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <p className="eyebrow">What are you sending?</p>
      <div className="type-grid">
        {types.map((t) => (
          <button key={t.type} className="type-card" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }} onClick={() => onSendType(t.type)}>
            <span className={`type-card-icon ${TYPE_ICON_CLASS[t.type] ?? ''}`}>{t.emoji}</span>
            <span>
              <span className="type-card-title" style={{ display: 'block' }}>{t.cardTitle}</span>
              <span className="hint">{t.type === 'PHOTO' ? 'Send a photo, a little note and something extra.' : t.type === 'PLAYLIST' ? 'Share a song or playlist with a little NIM.' : t.type === 'MOVIE' ? 'Turn a small gift into movie night.' : 'A little treat, just because.'}</span>
            </span>
          </button>
        ))}
      </div>

      <h2 className="section-title">Your Loops</h2>
      {loops === null && !error && <p className="hint">Loading…</p>}
      {loops && loops.length === 0 && (
        <div className="empty-state">
          <span style={{ fontSize: 28 }}>💌</span>
          <p style={{ margin: 0 }}>No moments yet — send your first CareDrop above.</p>
        </div>
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
