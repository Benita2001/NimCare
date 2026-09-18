/**
 * Real cryptographic verification of a Nimiq "signed message" — the scheme
 * Nimiq wallets (Keyguard/Hub, and by extension Nimiq Pay's sign()) use.
 *
 * Verified independently in this hardening pass two ways:
 *  1. Nimiq's own Hub/Keyguard docs (nimiq.github.io/hub/api-reference/sign-message):
 *     a 23-byte prefix `\x16Nimiq Signed Message:\n` (0x16 + the 22-char ASCII
 *     string) is prepended, together with the message's byte length written
 *     in decimal ASCII, then the message itself; the whole thing is SHA-256
 *     hashed, and that 32-byte digest is what gets Ed25519-signed.
 *  2. A live round-trip spike against the real @nimiq/core WASM library in
 *     this repo's Node environment: generated a real keypair, signed a
 *     message with this exact construction, and confirmed
 *     PublicKey.verify() accepts the genuine signature and rejects both a
 *     tampered message and a signature checked against the wrong public key.
 *
 * This is isolated in its own module deliberately (per hardening
 * instructions) so that if on-device testing against real Nimiq Pay reveals
 * a differing byte format, only this file needs correcting — nothing else
 * in the auth flow depends on the exact byte layout.
 */
import { PublicKey, Signature } from '@nimiq/core';
import { createHash } from 'node:crypto';

const MESSAGE_PREFIX = Buffer.concat([Buffer.from([0x16]), Buffer.from('Nimiq Signed Message:\n', 'utf8')]);

export function nimiqSignedMessageDigest(message: string): Buffer {
  const msgBytes = Buffer.from(message, 'utf8');
  const lenBytes = Buffer.from(String(msgBytes.length), 'utf8');
  const full = Buffer.concat([MESSAGE_PREFIX, lenBytes, msgBytes]);
  return createHash('sha256').update(full).digest();
}

export interface VerifyResult {
  ok: boolean;
  reason?: 'invalid_hex' | 'bad_signature' | 'address_mismatch';
}

/**
 * Verifies that `signatureHex` is a genuine signature by the holder of
 * `publicKeyHex` over `message` (using the Nimiq Signed Message scheme), AND
 * that the public key actually derives `claimedAddress`. Both checks are
 * required — a valid signature from an unrelated key must not authenticate
 * as someone else's address.
 */
export function verifyNimiqSignedMessage(params: {
  message: string;
  publicKeyHex: string;
  signatureHex: string;
  claimedAddress: string;
}): VerifyResult {
  let publicKey: PublicKey;
  let signature: Signature;
  try {
    publicKey = PublicKey.fromHex(params.publicKeyHex);
    signature = Signature.fromHex(params.signatureHex);
  } catch {
    return { ok: false, reason: 'invalid_hex' };
  }

  const digest = nimiqSignedMessageDigest(params.message);

  let sigValid: boolean;
  try {
    sigValid = publicKey.verify(signature, digest);
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }
  if (!sigValid) {
    return { ok: false, reason: 'bad_signature' };
  }

  const derivedAddress = publicKey.toAddress().toUserFriendlyAddress();
  const normalize = (a: string) => a.replace(/\s+/g, '').toUpperCase();
  if (normalize(derivedAddress) !== normalize(params.claimedAddress)) {
    return { ok: false, reason: 'address_mismatch' };
  }

  return { ok: true };
}
