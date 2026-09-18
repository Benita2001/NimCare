import { useSession } from '../sessionContext';
import { buildNimiqPayOpenLinks } from '../nimiq/deeplink';
import { EnvelopeCharacter, MusicCharacter, MovieCharacter, PolaroidStack, TicketPopcorn, Sparkle, HeartAccent, Blob, SendIcon } from '../components/Illustrations';

const ERROR_COPY: Record<string, string> = {
  PermissionDenied: 'Wallet access was declined. You can try again anytime.',
  ConsensusNotEstablished: 'Your wallet is still syncing with the network.',
  NoAccounts: 'No wallet account was found in Nimiq Pay.',
  BackendError: 'NimCare could not reach its server. Check your connection and try again.',
  Unknown: 'Something went wrong connecting your wallet.',
};

export function WelcomeScreen() {
  const { connect, status, errorKind, errorMessage } = useSession();

  // Outside Nimiq Pay, listAccounts() can never succeed — this is a real,
  // permanent condition (not a transient error), so it gets its own
  // conversion screen with a genuine "open in Nimiq Pay" action rather than
  // being lumped in with retryable errors.
  if (errorKind === 'ProviderUnavailable') {
    const nimiqPayLink = buildNimiqPayOpenLinks(window.location.origin).https;
    return (
      <div className="screen screen-center">
        <div className="hero-envelope"><EnvelopeCharacter className="hero-char" /></div>
        <h1>Open NimCare in Nimiq Pay</h1>
        <p className="subtitle">NimCare only works inside the Nimiq Pay app, where it can access your wallet.</p>
        <a className="btn btn-primary" href={nimiqPayLink} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Open in Nimiq Pay
        </a>
        <button className="btn btn-ghost" onClick={connect}>I'm already in Nimiq Pay — try again</button>
      </div>
    );
  }

  return (
    <div className="screen screen-wide">
      <header className="app-header">
        <span className="app-header-logo">
          <EnvelopeCharacter className="app-header-mark" /> NimCare
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-ghost app-header-signin" style={{ minHeight: 40, padding: '8px 16px' }} onClick={connect}>
            Sign in
          </button>
          <button className="btn btn-primary" style={{ minHeight: 40, padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }} onClick={connect} disabled={status === 'connecting'}>
            <SendIcon style={{ width: 16, height: 16, flexShrink: 0 }} /> Send a CareDrop
          </button>
        </div>
      </header>

      <div className="hero-shell">
        <div className="hero-cluster hero-cluster-left">
          <Blob className="hero-blob hero-blob-1" color="var(--color-accent-soft)" />
          <Blob className="hero-blob hero-blob-4" color="var(--color-gold-soft)" />
          <PolaroidStack className="hero-obj hero-obj-main" />
          <HeartAccent className="hero-accent hero-accent-a" />
          <Sparkle className="hero-accent hero-accent-c" />
        </div>

        <div className="hero-center">
          <div className="hero-envelope"><EnvelopeCharacter className="hero-char" /></div>

          <p className="eyebrow" style={{ color: 'var(--color-accent)' }}>NIMCARE</p>
          <h1>Send a moment,<br />not just money.</h1>
          <p className="subtitle">Send photos, playlists, movie-night surprises and a little NIM to someone you care about.</p>

          <div style={{ marginTop: 18 }}>
            <button className="btn btn-primary" onClick={connect} disabled={status === 'connecting'} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, justifyContent: 'center', width: '100%' }}>
              <SendIcon style={{ width: 18, height: 18 }} /> {status === 'connecting' ? 'Connecting…' : 'Send a CareDrop'}
            </button>
          </div>

          <div className="trust-row">
            <span>Private &amp; secure</span>
            <span>Powered by Nimiq</span>
            <span>Real connections</span>
          </div>

          {status === 'error' && (
            <div className="alert alert-error" role="alert" style={{ marginTop: 14, textAlign: 'left' }}>
              <strong>Couldn't connect.</strong>
              <p>{(errorKind && ERROR_COPY[errorKind]) ?? errorMessage}</p>
              <button className="btn btn-ghost" onClick={connect}>Try again</button>
            </div>
          )}
        </div>

        <div className="hero-cluster hero-cluster-right">
          <Blob className="hero-blob hero-blob-3" color="var(--color-sky-soft)" />
          <Blob className="hero-blob hero-blob-2" color="var(--color-green-soft)" />
          <MusicCharacter className="hero-char hero-obj hero-obj-secondary" />
          <MovieCharacter className="hero-char hero-obj hero-obj-tertiary" />
          <Sparkle className="hero-accent hero-accent-d" color="var(--color-sky)" />
        </div>
      </div>

      <section style={{ marginTop: 8 }}>
        <p className="eyebrow" style={{ textAlign: 'center', color: 'var(--color-accent)' }}>CAREDROPS</p>
        <h2 style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, margin: '4px 0 4px' }}>
          Send something they'll actually remember.
        </h2>
        <p className="subtitle" style={{ textAlign: 'center', margin: '0 0 18px' }}>Turn a little NIM into a meaningful moment.</p>

        <div className="feature-grid">
          <div className="feature-card" style={{ background: 'var(--color-accent-soft)' }}>
            <p className="feature-card-title">I was thinking of you</p>
            <p className="feature-card-desc">Send a photo, a little note and something extra.</p>
            <PolaroidStack className="feature-card-illustration" />
          </div>
          <div className="feature-card" style={{ background: 'var(--color-sky-soft)' }}>
            <p className="feature-card-title">This made me think of you</p>
            <p className="feature-card-desc">Share a song or playlist with a little NIM attached.</p>
            <MusicCharacter className="feature-card-illustration" />
          </div>
          <div className="feature-card" style={{ background: 'var(--color-gold-soft)' }}>
            <p className="feature-card-title">Movie on me</p>
            <p className="feature-card-desc">Turn a small gift into movie night.</p>
            <TicketPopcorn className="feature-card-illustration" />
          </div>
        </div>

        <p className="hint" style={{ textAlign: 'center', marginTop: 18 }}>
          Connect your Nimiq wallet, choose a moment, and send it directly — no setup for them, no accounts to accept. We never see your private keys.
        </p>
      </section>
    </div>
  );
}
