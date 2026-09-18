import { useEffect, useState } from 'react';
import type React from 'react';
import { useSession } from '../sessionContext';
import { api, type CareDropType } from '../api/client';
import { shortenAddress } from '../lib/luna';
import { EnvelopeCharacter, MusicCharacter, MovieCharacter, PolaroidStack, Sparkle, HeartAccent, Blob, PhotoIcon, MusicIcon, MovieIcon, GiftIcon } from '../components/Illustrations';
import { markStage } from '../diagnostics';

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
  const [typesError, setTypesError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionToken) return;
    api
      .myLoops(sessionToken)
      .then((res) => {
        setLoops(res.pairs);
        onLoopsLoaded(res.pairs);
        markStage('HOME:loops:loaded');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load your Loops.'));
    api
      .careDropTypes()
      .then((res) => {
        setTypes(res.types);
        markStage('HOME:types:loaded');
      })
      .catch((err) => setTypesError(err instanceof Error ? err.message : 'Could not load CareDrop types.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  useEffect(() => {
    markStage('HOME:render:ok');
  }, []);

  /**
   * Never trust a Loop row enough to crash on it — a stale/malformed row
   * (e.g. a legacy pair with a missing member, or any other unexpected
   * shape) is skipped rather than rendered. The server-side /pairs/mine
   * query already excludes legacy PENDING rows (see pairs.ts), but this is
   * a second, independent layer of defense: client code must never assume
   * the API response is well-formed. See MEMORY.md 2026-09-18 hotfix.
   */
  function resolveOtherWallet(loop: any): string | null {
    if (!loop || typeof loop !== 'object') return null;
    const a = loop.member_a_wallet;
    const b = loop.member_b_wallet;
    if (typeof a !== 'string' || !a || typeof b !== 'string' || !b) return null;
    if (a === address) return b;
    if (b === address) return a;
    return null; // current wallet isn't actually part of this row — skip it
  }

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
      {typesError && (
        <div className="alert alert-error">
          <p>{typesError}</p>
          <button className="btn btn-ghost" onClick={() => api.careDropTypes().then((res) => { setTypes(res.types); setTypesError(null); }).catch((err) => setTypesError(err instanceof Error ? err.message : 'Could not load CareDrop types.'))}>
            Try again
          </button>
        </div>
      )}

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
            const other = resolveOtherWallet(l);
            if (!other) {
              if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.warn('Skipping malformed Loop row (missing/invalid member):', l);
              }
              return null;
            }
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
