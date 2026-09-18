import { Router } from 'express';
import { nanoid } from 'nanoid';
import { createHash } from 'node:crypto';
import { db } from '../db/index.js';
import { isValidNimiqAddress, normalizeAddress } from '../nimiqAddress.js';
import { verifyNimiqSignedMessage } from '../services/nimiqSignedMessage.js';

export const authRouter = Router();

const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * The origin NimCare expects to be running from is configured server-side,
 * never trusted from client input (an attacker-supplied Origin would let
 * them mint a valid-looking challenge for phishing on another domain).
 * Falls back to a clearly-marked local-dev value so `npm run dev` works
 * without extra setup; production deployments MUST set APP_ORIGIN.
 */
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:5173 (dev)';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildChallengeMessage(address: string, nonce: string): string {
  return [
    'Sign in to NimCare',
    'Signing proves you own this wallet. It moves no funds.',
    `Origin: ${APP_ORIGIN}`,
    `Address: ${address}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}

authRouter.post('/nonce', (req, res) => {
  const { address } = req.body ?? {};
  if (!isValidNimiqAddress(address)) {
    return res.status(400).json({ error: 'invalid_address' });
  }
  const normalized = normalizeAddress(address);
  const now = new Date();
  const nonceId = nanoid(16);
  const message = buildChallengeMessage(normalized, nonceId);
  const expiresAt = new Date(now.getTime() + NONCE_TTL_MS).toISOString();

  db.prepare(
    `INSERT INTO auth_nonce (nonce, address, purpose, created_at, expires_at) VALUES (?, ?, 'session', ?, ?)`,
  ).run(message, normalized, now.toISOString(), expiresAt);

  db.prepare(
    `INSERT INTO wallet (address, created_at, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(address) DO NOTHING`,
  ).run(normalized, now.toISOString(), now.toISOString());

  res.json({ nonce: message, expiresAt });
});

/**
 * Verifies a wallet-signed challenge and issues a session.
 *
 * Real cryptographic verification (see services/nimiqSignedMessage.ts): the
 * signature must be a genuine Ed25519 signature over the exact challenge
 * message this server issued, by a public key that itself derives the
 * claimed address. An attacker who intercepts a nonce cannot authenticate
 * as that address without the real private key — the previous
 * STRUCTURAL_ONLY behavior (which accepted any publicKey/signature pair
 * shaped correctly) has been removed.
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

  const verification = verifyNimiqSignedMessage({
    message: nonce,
    publicKeyHex: publicKey,
    signatureHex: signature,
    claimedAddress: normalized,
  });

  if (!verification.ok) {
    // Nonce is still consumed on a failed attempt to prevent unlimited
    // retries against the same challenge (replay/brute-force mitigation).
    db.prepare(`UPDATE auth_nonce SET consumed_at = ? WHERE nonce = ?`).run(new Date().toISOString(), nonce);
    return res.status(401).json({ error: 'signature_invalid', reason: verification.reason });
  }

  const now = new Date();
  db.prepare(`UPDATE auth_nonce SET consumed_at = ? WHERE nonce = ?`).run(now.toISOString(), nonce);
  db.prepare(`UPDATE wallet SET public_key = ?, updated_at = ? WHERE address = ?`).run(
    publicKey,
    now.toISOString(),
    normalized,
  );

  const token = nanoid(32);
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  // Only the hash of the session token is stored — the plaintext token
  // exists solely in the response and the client's own memory, so a DB
  // read (or leak) cannot be used to impersonate an active session.
  db.prepare(`INSERT INTO session (token_hash, address, created_at, expires_at) VALUES (?, ?, ?, ?)`).run(
    hashToken(token),
    normalized,
    now.toISOString(),
    expiresAt,
  );

  res.json({ sessionToken: token, expiresAt, address: normalized });
});

export function requireSession(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'no_session' });
  const row = db.prepare(`SELECT * FROM session WHERE token_hash = ?`).get(hashToken(token)) as
    | { address: string; expires_at: string }
    | undefined;
  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(401).json({ error: 'session_expired' });
  }
  req.walletAddress = row.address;
  next();
}
