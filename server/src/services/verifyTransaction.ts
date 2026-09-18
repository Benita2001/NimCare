import { db } from '../db/index.js';
import { getTransactionByHash, NimiqRpcUnavailableError } from './nimiqRpc.js';

export interface CareDropRow {
  id: string;
  sender_wallet: string;
  recipient_wallet: string;
  amount_luna: number;
  reference: string;
  transaction_hash: string | null;
  status: string;
}

export type VerificationOutcome =
  | { kind: 'verified' }
  | { kind: 'mismatch'; reason: string }
  | { kind: 'rpc_unavailable' }
  | { kind: 'not_yet_visible' };

/** recipientData comes back hex-encoded from the RPC (see MEMORY.md); our
 * client sends the reference as a plain UTF-8 string via
 * sendBasicTransactionWithData, so we decode hex -> utf8 to compare. */
function decodeRecipientData(hex: string | undefined | null): string | null {
  if (!hex) return null;
  try {
    return Buffer.from(hex, 'hex').toString('utf8');
  } catch {
    return null;
  }
}

/** Optional: only enforced when NIMIQ_NETWORK_ID is configured, so a
 * testnet payment can never be accepted as verifying a mainnet CareDrop or
 * vice versa. Left unenforced (rather than guessing a default) when unset. */
function expectedNetworkId(): number | null {
  const raw = process.env.NIMIQ_NETWORK_ID;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Independently checks a submitted transaction hash against real Nimiq
 * blockchain data. Never trusts the client's claim of success. If no RPC
 * endpoint is configured, returns rpc_unavailable rather than fabricating a
 * verified result — see MEMORY.md / TRD.md for why this gap is real.
 *
 * Every check below is required before a CareDrop can be marked DELIVERED:
 * sender, recipient, exact integer amount, the CareDrop's own on-chain
 * reference (via recipientData — this is what stops one transaction from
 * being reused to "fund" a different CareDrop that happens to share the
 * same sender/recipient/amount), confirmation count, and — when configured
 * — the expected network.
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

  const decodedReference = decodeRecipientData(tx.recipientData);
  if (decodedReference !== drop.reference) {
    return {
      kind: 'mismatch',
      reason: `reference mismatch: expected ${drop.reference}, got ${decodedReference ?? '(none)'}`,
    };
  }

  const wantNetworkId = expectedNetworkId();
  if (wantNetworkId !== null && tx.networkId !== wantNetworkId) {
    return { kind: 'mismatch', reason: `network mismatch: expected networkId ${wantNetworkId}, got ${tx.networkId}` };
  }

  // Confirmed present on live mainnet responses during this hardening pass
  // (see MEMORY.md) though undocumented in the SDK's bundled types. When
  // the RPC reports it, an explicit `false` means the transaction's
  // on-chain logic did not succeed — never deliver on that.
  if (tx.executionResult === false) {
    return { kind: 'mismatch', reason: 'transaction executionResult was false' };
  }

  if (tx.confirmations < 1) {
    return { kind: 'not_yet_visible' };
  }

  return { kind: 'verified' };
}

/** A transaction hash must not already be attached, verified, to a
 * *different* CareDrop — defense in depth alongside the DB UNIQUE
 * constraint on caredrop.transaction_hash (see schema.sql). */
export function isTransactionHashReused(txHash: string, excludingCareDropId: string): boolean {
  const row = db
    .prepare(`SELECT id FROM caredrop WHERE transaction_hash = ? AND id != ?`)
    .get(txHash, excludingCareDropId) as { id: string } | undefined;
  return Boolean(row);
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
