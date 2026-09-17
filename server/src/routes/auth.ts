import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { isValidNimiqAddress, normalizeAddress } from '../nimiqAddress.js';

export const authRouter = Router();

const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

authRouter.post('/nonce', (req, res) => {
  const { address } = req.body ?? {};
  if (!isValidNimiqAddress(address)) {
    return res.status(400).json({ error: 'invalid_address' });
  }
  const normalized = normalizeAddress(address);
  const now = new Date();
  const nonce = `NimCare login\nAddress: ${normalized}\nNonce: ${nanoid(16)}\nIssued: ${now.toISOString()}`;
  const expiresAt = new Date(now.getTime() + NONCE_TTL_MS).toISOString();

  db.prepare(
    `INSERT INTO auth_nonce (nonce, address, purpose, created_at, expires_at) VALUES (?, ?, 'session', ?, ?)`,
  ).run(nonce, normalized, now.toISOString(), expiresAt);

  db.prepare(
    `INSERT INTO wallet (address, created_at, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(address) DO NOTHING`,
  ).run(normalized, now.toISOString(), now.toISOString());

  res.json({ nonce, expiresAt });
});

/**
 * Verifies a wallet-signed nonce and issues a session token.
 *
 * IMPORTANT (see MEMORY.md / TRD.md Spike S5): the exact message-hash format
 * @nimiq/mini-app-sdk's sign() uses has not been independently re-derived in
 * this environment against a real signature. This endpoint checks structural
 * validity (nonce exists, unexpired, unconsumed, address matches, a
 * publicKey+signature pair was supplied) but does NOT perform full
 * cryptographic signature verification yet — that requires a Nimiq-compatible
 * verification library wired to the confirmed message format, which is
 * flagged as an explicit follow-up in TASKS.md (NIM-008) rather than silently
 * assumed to be complete. Do not represent this as cryptographically proven
 * until that follow-up lands.
 */
authRouter.post('/verify', (req, res) => {
  const { address, publicKey, signature, nonce } = req.body ?? {};
  if (!isValidNimiqAddress(address) || !publicKey || !signature || !nonce) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  const normalized = normalizeAddress(address);

  const row = db
    .prepare(`SELECT * FROM auth_nonce WHERE nonce = ? AND address = ?`)
    .get(nonce, normalized) as { expires_at: string; consumed_at: string | null } | undefined;

  if (!row) return res.status(400).json({ error: 'unknown_nonce' });
  if (row.consumed_at) return res.status(400).json({ error: 'nonce_already_used' });
  if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).json({ error: 'nonce_expired' });

  const now = new Date();
  db.prepare(`UPDATE auth_nonce SET consumed_at = ? WHERE nonce = ?`).run(now.toISOString(), nonce);
  db.prepare(`UPDATE wallet SET public_key = ?, updated_at = ? WHERE address = ?`).run(
    publicKey,
    now.toISOString(),
    normalized,
  );

  const token = nanoid(32);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  db.prepare(`INSERT INTO session (token, address, created_at, expires_at) VALUES (?, ?, ?, ?)`).run(
    token,
    normalized,
    now.toISOString(),
    expiresAt,
  );

  res.json({ sessionToken: token, expiresAt, address: normalized, signatureVerification: 'STRUCTURAL_ONLY' });
});

export function requireSession(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'no_session' });
  const row = db.prepare(`SELECT * FROM session WHERE token = ?`).get(token) as
    | { address: string; expires_at: string }
    | undefined;
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(401).json({ error: 'session_expired' });
  }
  req.walletAddress = row.address;
  next();
}
