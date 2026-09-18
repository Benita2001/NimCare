import { useState } from 'react';
import { getProvider } from '../nimiq/provider';
import { nimToLuna } from '../lib/luna';

/**
 * TEMPORARY, diagnostic-only screen for the 2026-09-18 real-device
 * `internal_error` investigation (see MEMORY.md). Only reachable by adding
 * `?diag=tx` to the URL — it is never linked from any button, menu, or
 * normal navigation path, so a regular user cannot stumble into it.
 *
 * Runs `sendBasicTransaction()` ("Test A") and
 * `sendBasicTransactionWithData()` ("Test B") directly against the
 * connected wallet, with the same recipient/amount, to isolate whether the
 * attached CareDrop data is what's causing the failure. Remove this file
 * and its App.tsx wiring once the real device retest has identified (and
 * this hotfix has fixed) the cause — it must not ship long-term.
 */
export function TxDiagnosticScreen() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.00001');
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const append = (line: string) => setLog((l) => [...l, line]);

  const runTest = async (withData: boolean) => {
    setBusy(true);
    append(`--- Test ${withData ? 'B (sendBasicTransactionWithData)' : 'A (sendBasicTransaction)'} ---`);
    try {
      const provider = await getProvider();
      const consensus = await provider.isConsensusEstablished();
      append(`consensus: ${consensus}`);
      const blockNumber = await provider.getBlockNumber().catch(() => 'unavailable');
      append(`blockNumber: ${blockNumber}`);
      const amountLuna = nimToLuna(amount || '0');
      append(`recipient: ${recipient || '(empty)'}`);
      append(`value (luna): ${amountLuna}`);

      const result = withData
        ? await provider.sendBasicTransactionWithData({ recipient, value: amountLuna, data: 'NC:DIAG:TEST' })
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
      <button className="btn btn-primary" disabled={busy} onClick={() => runTest(false)}>
        Test A: sendBasicTransaction
      </button>
      <button className="btn btn-primary" disabled={busy} onClick={() => runTest(true)}>
        Test B: sendBasicTransactionWithData
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
