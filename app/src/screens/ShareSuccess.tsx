import { useState } from 'react';
import { buildNimiqPayOpenLinks, careDropTargetUrl } from '../nimiq/deeplink';
import { EnvelopeCharacter } from '../components/Illustrations';

export function ShareSuccessScreen({ shareToken, onDone }: { shareToken: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = careDropTargetUrl(shareToken);
  const nimiqPayLink = buildNimiqPayOpenLinks(link).https;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'A CareDrop from NimCare', url: link });
        return;
      } catch {
        // fall through to copy
      }
    }
    await navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
  };

  return (
    <div className="screen">
      <div className="success-hero">
        <div className="success-icon"><EnvelopeCharacter /></div>
        <h1>Your CareDrop is ready.</h1>
        <p className="subtitle">Send it when the moment feels right.</p>
      </div>

      <button className="btn btn-primary" onClick={share}>
        Share surprise
      </button>
      <a className="btn btn-ghost" href={nimiqPayLink} style={{ textAlign: 'center', textDecoration: 'none' }}>
        Open in Nimiq Pay instead
      </a>
      <button
        className="btn btn-ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(link).catch(() => {});
          setCopied(true);
        }}
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>

      <p className="hint" style={{ textAlign: 'center' }}>They'll see it when they open your link.</p>

      <button className="btn btn-ghost" onClick={onDone}>Back to Home</button>
    </div>
  );
}
