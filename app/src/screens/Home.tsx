import { useEffect, useState } from 'react';
import type React from 'react';
import { useSession } from '../sessionContext';
import { api, type CareDropType } from '../api/client';
import { shortenAddress } from '../lib/luna';
import { EnvelopeCharacter, MusicCharacter, MovieCharacter, PolaroidStack, Sparkle, HeartAccent, Blob, PhotoIcon, MusicIcon, MovieIcon, GiftIcon } from '../components/Illustrations';

const TYPE_ICON_CLASS: Record<string, string> = {
  PHOTO: 'type-card-photo',
  PLAYLIST: 'type-card-playlist',
  MOVIE: 'type-card-movie',
  TREAT: 'type-card-treat',
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  PHOTO: PhotoIcon,
  PLAYLIST: MusicIcon,
  MOVIE: MovieIcon,
  TREAT: GiftIcon,
};

const TYPE_DESC: Record<string, string> = {
  PHOTO: 'Send a photo, a little note and something extra.',
  PLAYLIST: 'Share a song or playlist with a little NIM.',
  MOVIE: 'Turn a small gift into movie night.',
  TREAT: 'A little treat, just because.',
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
        <span className="app-header-logo">
          <EnvelopeCharacter className="app-header-mark" /> NimCare
        </span>
        <span className="wallet-chip">{address ? shortenAddress(address) : ''}</span>
      </header>

      <div className="hero-shell">
        <div className="hero-cluster hero-cluster-left">
          <Blob className="hero-blob hero-blob-1" color="var(--color-accent-soft)" />
          <Blob className="hero-blob hero-blob-4" color="var(--color-gold-soft)" />
          <PolaroidStack className="hero-obj hero-obj-main" />
          <HeartAccent className="hero-accent hero-accent-a" />
        </div>

        <div className="hero-center">
          <div className="hero-envelope"><EnvelopeCharacter className="hero-char" /></div>
          <h1>Make their day.</h1>
          <p className="subtitle">Send a moment, not just money.</p>
        </div>

        <div className="hero-cluster hero-cluster-right">
          <Blob className="hero-blob hero-blob-3" color="var(--color-sky-soft)" />
          <Blob className="hero-blob hero-blob-2" color="var(--color-green-soft)" />
          <MusicCharacter className="hero-char hero-obj hero-obj-secondary" />
          <MovieCharacter className="hero-char hero-obj hero-obj-tertiary" />
          <Sparkle className="hero-accent hero-accent-d" color="var(--color-sky)" />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <p className="eyebrow">What are you sending?</p>
      <div className="type-grid">
        {types.map((t) => {
          const Icon = TYPE_ICON[t.type] ?? GiftIcon;
          return (
            <button key={t.type} className="type-card" onClick={() => onSendType(t.type)}>
              <span className={`type-card-icon ${TYPE_ICON_CLASS[t.type] ?? ''}`}>
                <Icon className="type-card-icon-svg" />
              </span>
              <span>
                <span className="type-card-title" style={{ display: 'block' }}>{t.cardTitle}</span>
                <span className="hint">{TYPE_DESC[t.type] ?? ''}</span>
              </span>
            </button>
          );
        })}
      </div>

      <h2 className="section-title">Your Loops</h2>
      {loops === null && !error && <p className="hint">Loading…</p>}
      {loops && loops.length === 0 && (
        <div className="empty-state">
          <EnvelopeCharacter style={{ width: 44, height: 44 }} />
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
