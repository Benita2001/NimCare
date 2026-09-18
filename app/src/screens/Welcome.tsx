import { useSession } from '../sessionContext';
import { buildNimiqPayOpenLinks } from '../nimiq/deeplink';
import { HeroDecor } from '../components/HeroDecor';

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
        <div className="hero">
          <HeroDecor />
          <h1>Open NimCare in Nimiq Pay</h1>
          <p className="subtitle">NimCare only works inside the Nimiq Pay app, where it can access your wallet.</p>
        </div>
        <a className="btn btn-primary" href={nimiqPayLink} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Open in Nimiq Pay
        </a>
        <button className="btn btn-ghost" onClick={connect}>I'm already in Nimiq Pay — try again</button>
      </div>
    );
  }

  return (
    <div className="screen screen-center">
      <div className="hero">
        <HeroDecor />
        <h1>Send a moment,<br />not just money.</h1>
        <p className="subtitle">Send photos, playlists, movie-night surprises and a little NIM to someone you care about.</p>
      </div>

      <button className="btn btn-primary" onClick={connect} disabled={status === 'connecting'}>
        {status === 'connecting' ? 'Connecting…' : 'Continue with Nimiq Pay'}
      </button>

      {status === 'error' && (
        <div className="alert alert-error" role="alert">
          <strong>Couldn't connect.</strong>
          <p>{(errorKind && ERROR_COPY[errorKind]) ?? errorMessage}</p>
          <button className="btn btn-ghost" onClick={connect}>Try again</button>
        </div>
      )}

      <p className="hint">
        NimCare needs your wallet address so your CareDrops belong to you. We never see your private keys.
      </p>
    </div>
  );
}
