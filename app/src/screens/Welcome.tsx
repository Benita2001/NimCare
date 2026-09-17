import { useSession } from '../session';

const ERROR_COPY: Record<string, string> = {
  ProviderUnavailable: 'Open NimCare inside Nimiq Pay to connect your wallet.',
  PermissionDenied: 'Wallet access was declined. You can try again anytime.',
  ConsensusNotEstablished: 'Your wallet is still syncing with the network.',
  NoAccounts: 'No wallet account was found in Nimiq Pay.',
  BackendError: 'NimCare could not reach its server. Check your connection and try again.',
  Unknown: 'Something went wrong connecting your wallet.',
};

export function WelcomeScreen() {
  const { connect, status, errorKind, errorMessage } = useSession();

  return (
    <div className="screen screen-center">
      <div className="brand-mark">💛</div>
      <h1>Send more than money.</h1>
      <p className="subtitle">Turn a small NIM gift into a moment that matters.</p>

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
