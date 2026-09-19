import { useState } from 'react';
import { useSession } from '../sessionContext';
import { api } from '../api/client';
import { sendCareDropPayment, nextAttemptId } from '../nimiq/provider';
import { nimToLuna } from '../lib/luna';

type CreatedDrop = { id: string; recipient: string; amountLuna: number; reference: string; shareToken: string };

/**
 * TEMPORARY, diagnostic-only screen for the 2026-09-18 timing/lifecycle
 * investigation (see MEMORY.md, instruction #20 — "Build a prepared-card
 * test"). Only reachable via `?diag=prepared` — never linked from normal
 * navigation.
 *
 * Splits the normal Composer flow's two phases into two *separate*,
 * explicit user taps, using a real CareDrop (not a synthetic diagnostic
 * payload): "Prepare" creates a real CareDrop via the backend and stops.
 * "Send prepared CareDrop" is a fresh tap that performs ONLY the provider
 * call — no upload, no backend call, nothing else — against the drop
 * "Prepare" already created and displayed.
 *
 * If "Send prepared CareDrop" succeeds where the normal single-tap flow
 * fails, that is strong evidence the bug is about elapsed time / async
 * work between the user's gesture and the provider call, not the payload
 * itself — proving (or rejecting) the hypothesis in MEMORY.md before any
 * production architecture change is made around it, per this
 * investigation's explicit instruction not to refactor production on
 * theory alone.
 *
 * Remove this file and its App.tsx wiring once the real device retest has
 * identified (and this hotfix has fixed) the cause.
 */
export function PreparedCardTestScreen() {
  const { sessionToken } = useSession();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.00001');
  const [drop, setDrop] = useState<CreatedDrop | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const append = (line: string) => setLog((l) => [...l, line]);

  const prepare = async () => {
    if (!sessionToken || busy) return;
    setBusy(true);
    setDrop(null);
    append('--- Preparing CareDrop (backend only — no wallet call) ---');
    try {
      const amountLuna = nimToLuna(amount || '0');
      const created = await api.createCareDrop(
        { recipientWallet: recipient, type: 'TREAT', amountLuna },
        sessionToken,
      );
      setDrop(created);
      append(`prepared: recipient=${created.recipient}`);
      append(`prepared: amountLuna=${created.amountLuna}`);
      append(`prepared: reference=${created.reference}`);
      append('Now tap "Send prepared CareDrop" as a fresh, separate action.');
    } catch (err) {
      append(`prepare failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const sendPrepared = async () => {
    if (!drop || busy) return;
    setBusy(true);
    const tapStartedAt = performance.now();
    const attemptId = nextAttemptId();
    append(`--- Sending prepared CareDrop (fresh tap, provider call ONLY, ${attemptId}) ---`);
    try {
      const result = await sendCareDropPayment({
        recipient: drop.recipient,
        amountLuna: drop.amountLuna,
        reference: drop.reference,
        attemptId,
        tapStartedAt,
      });
      append(`elapsed: t+${Math.round(performance.now() - tapStartedAt)}ms`);
      append(`result: ${JSON.stringify(result)}`);
    } catch (err) {
      append(`threw: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen" style={{ fontFamily: 'monospace', fontSize: 12 }}>
      <h1 style={{ fontFamily: 'inherit', fontSize: 16 }}>Prepared-Card Test (temporary)</h1>
      <p className="hint">
        Not linked from normal navigation — reached via ?diag=prepared only. Remove after device retest.
      </p>
      <label className="field-label" htmlFor="prepared-recipient">Recipient</label>
      <input id="prepared-recipient" className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="NQ.." />
      <label className="field-label" htmlFor="prepared-amount">Amount (NIM)</label>
      <input id="prepared-amount" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button className="btn btn-primary" disabled={busy || !recipient} onClick={prepare}>
        1. Prepare (backend only)
      </button>
      <button className="btn btn-primary" disabled={busy || !drop} onClick={sendPrepared}>
        2. Send prepared CareDrop (fresh tap — provider call only)
      </button>
      <button className="btn btn-ghost" onClick={() => setLog([])}>
        Clear log
      </button>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f4f4f4', padding: 8, marginTop: 12 }}>
        {log.join('\n')}
      </pre>
    </div>
  );
}
