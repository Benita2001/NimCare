import { useState } from 'react';
import { getProvider } from '../nimiq/provider';
import { nimToLuna } from '../lib/luna';

/**
 * TEMPORARY, diagnostic-only screen for the 2026-09-18 real-device
 * `internal_error` investigation (see MEMORY.md). Only reachable by adding
 * `?diag=tx` to the URL — it is never linked from any button, menu, or
 * normal navigation path, so a regular user cannot stumble into it.
 *
 * Test A: sendBasicTransaction() — no data.
 * Test B: sendBasicTransactionWithData() with an arbitrary diagnostic
 *   string, to isolate whether attaching *any* data is the problem.
 * Test C: sendBasicTransactionWithData() with a reference in the *exact*
 *   format a real CareDrop uses (`NC:D:<10 chars>`, matching
 *   server/src/routes/caredrops.ts's shortRef()) — to isolate whether the
 *   normal reference format specifically (as opposed to data in general)
 *   is what the provider rejects. Real device evidence (2026-09-18) shows
 *   A and B both succeed while the normal CareDrop flow still fails, so C
 *   is the test that actually distinguishes the remaining hypotheses.
 *
 * Remove this file and its App.tsx wiring once the real device retest has
 * identified (and this hotfix has fixed) the cause — it must not ship
 * long-term.
 */
function generateNormalFormatReference(): string {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  return `NC:D:${id}`;
}

export function TxDiagnosticScreen() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.00001');
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const append = (line: string) => setLog((l) => [...l, line]);

  const runTest = async (label: string, data?: string) => {
    setBusy(true);
    append(`--- ${label} ---`);
    try {
      const provider = await getProvider();
      const consensus = await provider.isConsensusEstablished();
      append(`consensus: ${consensus}`);
      const blockNumber = await provider.getBlockNumber().catch(() => 'unavailable');
      append(`blockNumber: ${blockNumber}`);
      const amountLuna = nimToLuna(amount || '0');
      append(`recipient: ${recipient || '(empty)'}`);
      append(`value (luna): ${amountLuna}`);
      if (data !== undefined) {
        append(`data: ${data} (${new TextEncoder().encode(data).length} bytes)`);
      }

      const result = data !== undefined
        ? await provider.sendBasicTransactionWithData({ recipient, value: amountLuna, data })
        : await provider.sendBasicTransaction({ recipient, value: amountLuna });
      append(`result: ${JSON.stringify(result)}`);
    } catch (err) {
      const ctor = err && typeof err === 'object' ? err.constructor?.name : typeof err;
      const message = err instanceof Error ? err.message : String(err);
      append(`threw: ${ctor}: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen" style={{ fontFamily: 'monospace', fontSize: 12 }}>
      <h1 style={{ fontFamily: 'inherit', fontSize: 16 }}>Tx Diagnostic (temporary)</h1>
      <p className="hint">
        Not linked from normal navigation — reached via ?diag=tx only. Remove after device retest confirms the fix.
      </p>
      <label className="field-label">Recipient</label>
      <input className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="NQ.." />
      <label className="field-label">Amount (NIM)</label>
      <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <button className="btn btn-primary" disabled={busy} onClick={() => runTest('Test A: sendBasicTransaction')}>
        Test A: sendBasicTransaction
      </button>
      <button
        className="btn btn-primary"
        disabled={busy}
        onClick={() => runTest('Test B: sendBasicTransactionWithData (arbitrary data)', 'NC:DIAG:TEST')}
      >
        Test B: with arbitrary data
      </button>
      <button
        className="btn btn-primary"
        disabled={busy}
        onClick={() => runTest('Test C: sendBasicTransactionWithData (normal reference format)', generateNormalFormatReference())}
      >
        Test C: with normal reference format
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
