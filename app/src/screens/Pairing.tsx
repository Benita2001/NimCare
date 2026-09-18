import { useEffect, useState } from 'react';
import { useSession } from '../sessionContext';
import { api } from '../api/client';
import { buildNimiqPayOpenLinks, inviteTargetUrl } from '../nimiq/deeplink';

export function CreateInviteScreen({ onBack, onCreated }: { onBack: () => void; onCreated: (pairId: string) => void }) {
  const { sessionToken } = useSession();
  const [relationshipType, setRelationshipType] = useState<'PARTNER' | 'FRIEND' | 'FAMILY'>('PARTNER');
  const [invite, setInvite] = useState<{ token: string; pairId: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!sessionToken) return;
    setError(null);
    try {
      const res = await api.createInvite(relationshipType, sessionToken);
      setInvite({ token: res.token, pairId: res.pairId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create invite.');
    }
  };

  const inviteLink = invite ? inviteTargetUrl(invite.token) : '';
  const nimiqPayLink = invite ? buildNimiqPayOpenLinks(inviteLink).https : '';

  return (
    <div className="screen">
      <button className="btn btn-ghost btn-back" onClick={onBack}>← Back</button>
      <h1>Create your Loop</h1>

      {!invite && (
        <>
          <p className="hint">Who is this for?</p>
          <div className="option-group">
            {(['PARTNER', 'FRIEND', 'FAMILY'] as const).map((t) => (
              <button
                key={t}
                className={`option-pill ${relationshipType === t ? 'option-pill-active' : ''}`}
                onClick={() => setRelationshipType(t)}
              >
                {t === 'PARTNER' ? 'Partner' : t === 'FRIEND' ? 'Friend' : 'Family'}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={create}>Create invite</button>
          {error && <div className="alert alert-error">{error}</div>}
        </>
      )}

      {invite && (
        <div className="invite-share">
          <p>Send this link to them — tapping it on their phone opens NimCare inside Nimiq Pay:</p>
          <a className="btn btn-primary" href={nimiqPayLink} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Open in Nimiq Pay
          </a>
          <div className="invite-link">{inviteLink}</div>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteLink).catch(() => {});
              setCopied(true);
            }}
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <p className="hint">
            If the link doesn't carry the invite through, they can also just open NimCare in Nimiq Pay and enter this
            code:
          </p>
          <div className="invite-link">{invite.token}</div>
          <p className="hint">Waiting for them to accept…</p>
          <button className="btn btn-ghost" onClick={() => onCreated(invite.pairId)}>Continue to Home</button>
        </div>
      )}
    </div>
  );
}

export function AcceptInviteScreen({
  inviteToken,
  onBack,
  onAccepted,
}: {
  inviteToken: string;
  onBack: () => void;
  onAccepted: (pairId: string) => void;
}) {
  const { sessionToken } = useSession();
  const [preview, setPreview] = useState<{ relationshipType: string; invitedBy: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    api
      .getInvite(inviteToken)
      .then((res) => setPreview(res))
      .catch((err) => setError(err.message));
  }, [inviteToken]);

  const accept = async () => {
    if (!sessionToken) return;
    setAccepting(true);
    setError(null);
    try {
      const res = await api.acceptInvite(inviteToken, sessionToken);
      onAccepted(res.pairId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite.');
    } finally {
      setAccepting(false);
    }
  };

  const ERROR_COPY: Record<string, string> = {
    invite_not_found: 'This invite link is not valid.',
    invite_already_used: 'This invite has already been used.',
    invite_expired: 'This invite has expired.',
    cannot_accept_own_invite: 'You can’t accept your own invite.',
    pair_already_complete: 'This Loop is already complete.',
  };

  return (
    <div className="screen">
      <button className="btn btn-ghost btn-back" onClick={onBack}>← Back</button>
      <h1>You've been invited</h1>

      {error && <div className="alert alert-error">{ERROR_COPY[error] ?? error}</div>}

      {!error && !preview && <p className="hint">Loading invite…</p>}

      {preview && (
        <div className="invite-preview">
          <p>Someone wants to start a {preview.relationshipType.toLowerCase()} Loop with you on NimCare.</p>
          <button className="btn btn-primary" onClick={accept} disabled={accepting}>
            {accepting ? 'Accepting…' : 'Accept Loop'}
          </button>
        </div>
      )}
    </div>
  );
}
