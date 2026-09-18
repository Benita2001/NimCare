import { useEffect, useState } from 'react';
import { useSession } from '../sessionContext';
import { api } from '../api/client';
import { shortenAddress } from '../lib/luna';

export function HomeScreen({
  onCreateInvite,
  onOpenPair,
  onAcceptInviteCode,
}: {
  onCreateInvite: () => void;
  onOpenPair: (pairId: string) => void;
  onAcceptInviteCode: (token: string) => void;
}) {
  const { address, sessionToken } = useSession();
  const [pairs, setPairs] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    if (!sessionToken) return;
    api
      .myPairs(sessionToken)
      .then((res) => setPairs(res.pairs))
      .catch((err) => setError(err.message));
  }, [sessionToken]);

  return (
    <div className="screen">
      <header className="app-header">
        <span className="wallet-chip">{address ? shortenAddress(address) : ''}</span>
      </header>

      <h1>NimCare</h1>

      {error && <div className="alert alert-error">{error}</div>}

      {pairs === null && !error && <p className="hint">Loading your Loops…</p>}

      {pairs && pairs.length === 0 && (
        <div className="empty-state">
          <p>You haven't started a Loop yet.</p>
          <button className="btn btn-primary" onClick={onCreateInvite}>Create your first Loop</button>
        </div>
      )}

      {pairs && pairs.length > 0 && (
        <div className="pair-list">
          {pairs.map((p) => (
            <button key={p.id} className="pair-card" onClick={() => onOpenPair(p.id)}>
              <div className="pair-card-type">{p.relationship_type}</div>
              <div className="pair-card-status">{p.status === 'ACCEPTED' ? 'Connected' : 'Waiting for them to join'}</div>
            </button>
          ))}
          <button className="btn btn-ghost" onClick={onCreateInvite}>+ Start another Loop</button>
        </div>
      )}

      <div className="invite-code-entry">
        <label className="field-label">Have an invite code?</label>
        <input
          className="input"
          placeholder="Paste invite code…"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />
        <button className="btn btn-ghost" disabled={!inviteCode.trim()} onClick={() => onAcceptInviteCode(inviteCode.trim())}>
          Accept invite
        </button>
      </div>
    </div>
  );
}
