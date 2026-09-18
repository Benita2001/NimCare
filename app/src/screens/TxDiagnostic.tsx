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
 *   server/src/routes/caredrops.ts's shortRef()).
 * Test E1-E5: same known-working (Test C) payload, with an increasing
 *   amount of async work (delay or harmless fetches) inserted between the
 *   tap and the provider call — to test whether elapsed time / intervening
 *   async work since the user gesture correlates with internal_error.
 * Test F1-F3: same known-working payload, varying whether the
 *   isConsensusEstablished()/getBlockNumber() preflight calls happen
 *   before the send — to test whether those preflight calls themselves
 *   matter.
 *
 * Real device evidence (2026-09-18): A, B, and C (with no preceding async
 * work) all PASS, while the normal CareDrop flow — which does a photo
 * upload and a backend round trip before the provider call — still fails.
 * E and F exist to test the leading hypothesis this points to: that
 * elapsed time / intervening async work since the user's tap, not the
 * payload itself, is what the provider rejects.
 *
 * Remove this file and its App.tsx wiring once the real device retest has
 * identified (and this hotfix has fixed) the cause — it must not ship
 * long-term.
 */
function generateNormalFormatReference(): string {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  return `NC:D:${id}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A harmless, side-effect-free network round trip, purely to occupy time
 * the same way a real API call would (not to test any endpoint's content). */
async function harmlessFetch(): Promise<void> {
  try {
    await fetch('/api/health');
  } catch {
    // Irrelevant to the test — we only care about the elapsed time, not
    // whether this particular endpoint exists or succeeds.
  }
}

interface RunOptions {
  label: string;
  data?: string;
  preDelayMs?: number;
  preFetchCount?: number;
  skipConsensusCheck?: boolean;
  skipBlockNumberCheck?: boolean;
}

export function TxDiagnosticScreen() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.00001');
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const append = (line: string) => setLog((l) => [...l, line]);

  const runTest = async (opts: RunOptions) => {
    setBusy(true);
    const tapStartedAt = performance.now();
    const since = () => `t+${Math.round(performance.now() - tapStartedAt)}ms`;
    append(`--- ${opts.label} (${since()}) ---`);
    try {
      if (opts.preDelayMs) {
        await delay(opts.preDelayMs);
        append(`after delay (${since()})`);
      }
      for (let i = 0; i < (opts.preFetchCount ?? 0); i++) {
        await harmlessFetch();
        append(`after harmless fetch ${i + 1} (${since()})`);
      }

      const provider = await getProvider();
      append(`provider ready (${since()})`);

      if (!opts.skipConsensusCheck) {
        const consensus = await provider.isConsensusEstablished();
        append(`consensus: ${consensus} (${since()})`);
      }
      if (!opts.skipBlockNumberCheck) {
        const blockNumber = await provider.getBlockNumber().catch(() => 'unavailable');
        append(`blockNumber: ${blockNumber} (${since()})`);
      }

      const amountLuna = nimToLuna(amount || '0');
      append(`recipient: ${recipient || '(empty)'}`);
      append(`value (luna): ${amountLuna}`);
      if (opts.data !== undefined) {
        append(`data: ${opts.data} (${new TextEncoder().encode(opts.data).length} bytes)`);
      }

      append(`send starting (${since()})`);
      const result = opts.data !== undefined
        ? await provider.sendBasicTransactionWithData({ recipient, value: amountLuna, data: opts.data })
        : await provider.sendBasicTransaction({ recipient, value: amountLuna });
      append(`result (${since()}): ${JSON.stringify(result)}`);
    } catch (err) {
      const ctor = err && typeof err === 'object' ? err.constructor?.name : typeof err;
      const message = err instanceof Error ? err.message : String(err);
      append(`threw (${since()}): ${ctor}: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const btn = (label: string, opts: Omit<RunOptions, 'label'>) => (
    <button className="btn btn-primary" disabled={busy} onClick={() => runTest({ label, ...opts })}>
      {label}
    </button>
  );

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

      <p className="hint" style={{ marginTop: 12 }}>Baseline (already run on-device with PASS — for reference/re-run only)</p>
      {btn('Test A: sendBasicTransaction', {})}
      {btn('Test B: with arbitrary data', { data: 'NC:DIAG:TEST' })}
      {btn('Test C: with normal reference format', { data: generateNormalFormatReference() })}

      <p className="hint" style={{ marginTop: 12 }}>Test E: delay differential (known-working payload, varying async work before send)</p>
      {btn('E1: send immediately', { data: generateNormalFormatReference() })}
      {btn('E2: wait 500ms, then send', { data: generateNormalFormatReference(), preDelayMs: 500 })}
      {btn('E3: wait 2s, then send', { data: generateNormalFormatReference(), preDelayMs: 2000 })}
      {btn('E4: 1 harmless fetch, then send', { data: generateNormalFormatReference(), preFetchCount: 1 })}
      {btn('E5: 2 harmless fetches, then send', { data: generateNormalFormatReference(), preFetchCount: 2 })}

      <p className="hint" style={{ marginTop: 12 }}>Test F: preflight call order (known-working payload)</p>
      {btn('F1: send directly, no preflight', { data: generateNormalFormatReference(), skipConsensusCheck: true, skipBlockNumberCheck: true })}
      {btn('F2: consensus check, then send', { data: generateNormalFormatReference(), skipBlockNumberCheck: true })}
      {btn('F3: consensus + block number, then send (matches normal flow)', { data: generateNormalFormatReference() })}

      <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setLog([])}>
        Clear log
      </button>
      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', background: '#f4f4f4', padding: 8, marginTop: 12 }}>
        {log.join('\n')}
      </pre>
    </div>
  );
}
