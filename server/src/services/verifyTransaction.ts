import { db } from '../db/index.js';
import { getTransactionByHash, NimiqRpcUnavailableError } from './nimiqRpc.js';

export interface CareDropRow {
  id: string;
  sender_wallet: string;
  recipient_wallet: string;
  amount_luna: number;
  transaction_hash: string | null;
  status: string;
}

export type VerificationOutcome =
  | { kind: 'verified' }
  | { kind: 'mismatch'; reason: string }
  | { kind: 'rpc_unavailable' }
  | { kind: 'not_yet_visible' };

/**
 * Independently checks a submitted transaction hash against real Nimiq
 * blockchain data. Never trusts the client's claim of success. If no RPC
 * endpoint is configured, returns rpc_unavailable rather than fabricating a
 * verified result — see MEMORY.md / TRD.md for why this gap is real.
 */
export async function verifyCareDropTransaction(drop: CareDropRow): Promise<VerificationOutcome> {
  if (!drop.transaction_hash) {
    return { kind: 'not_yet_visible' };
  }

  let tx;
  try {
    tx = await getTransactionByHash(drop.transaction_hash);
  } catch (err) {
    if (err instanceof NimiqRpcUnavailableError) {
      return { kind: 'rpc_unavailable' };
    }
    throw err;
  }

  if (!tx) {
    return { kind: 'not_yet_visible' };
  }

  if (tx.to !== drop.recipient_wallet) {
    return { kind: 'mismatch', reason: `recipient mismatch: expected ${drop.recipient_wallet}, got ${tx.to}` };
  }
  if (tx.from !== drop.sender_wallet) {
    return { kind: 'mismatch', reason: `sender mismatch: expected ${drop.sender_wallet}, got ${tx.from}` };
  }
  if (tx.value !== drop.amount_luna) {
    return { kind: 'mismatch', reason: `amount mismatch: expected ${drop.amount_luna}, got ${tx.value}` };
  }
  if (tx.confirmations < 1) {
    return { kind: 'not_yet_visible' };
  }

  return { kind: 'verified' };
}

export function applyVerificationOutcome(dropId: string, outcome: VerificationOutcome): void {
  const now = new Date().toISOString();
  if (outcome.kind === 'verified') {
    db.prepare(
      `UPDATE caredrop SET status = 'DELIVERED', blockchain_verification_status = 'VERIFIED', funded_at = ? WHERE id = ?`,
    ).run(now, dropId);
  } else if (outcome.kind === 'mismatch') {
    db.prepare(
      `UPDATE caredrop SET status = 'FAILED', blockchain_verification_status = 'MISMATCH', failure_reason = ? WHERE id = ?`,
    ).run(outcome.reason, dropId);
  } else if (outcome.kind === 'rpc_unavailable') {
    db.prepare(`UPDATE caredrop SET blockchain_verification_status = 'RPC_UNAVAILABLE' WHERE id = ?`).run(dropId);
  } else {
    db.prepare(`UPDATE caredrop SET blockchain_verification_status = 'PENDING' WHERE id = ?`).run(dropId);
  }
}
