import { db } from '../db/index.js';

/**
 * Ensures a `wallet` row exists for `address`. This is NOT an
 * authentication mechanism — it only satisfies the foreign-key
 * prerequisite that `pair.member_b_wallet` / `caredrop.recipient_wallet`
 * reference `wallet(address)`. The row carries no `public_key` (stays
 * NULL until that address actually authenticates via auth.ts's real
 * signature verification) and must never be treated as proof of
 * ownership, session validity, or trust. `requireSession` remains the
 * only thing that grants access to anything.
 *
 * 2026-09-18 backend root-cause fix: the surprise-first product lets a
 * sender name a recipient who has never opened NimCare before. Before
 * this, only `POST /api/auth/nonce` ever inserted a `wallet` row, so
 * `POST /api/caredrops` -> `findOrCreateLoop` failed with a real,
 * production-confirmed Postgres foreign-key violation (SQLSTATE 23503,
 * constraint `pair_member_b_wallet_fkey`) for any never-before-seen
 * recipient. See MEMORY.md.
 */
export async function ensureWalletRecord(address: string): Promise<void> {
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO wallet (address, created_at, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(address) DO NOTHING`,
    [address, now, now],
  );
}
