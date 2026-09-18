import { describe, it, expect } from 'vitest';
import { KeyPair, Signature } from '@nimiq/core';
import { verifyNimiqSignedMessage, nimiqSignedMessageDigest } from './nimiqSignedMessage.js';

function sign(keyPair: InstanceType<typeof KeyPair>, message: string) {
  const digest = nimiqSignedMessageDigest(message);
  return Signature.create(keyPair.privateKey, keyPair.publicKey, digest).toHex();
}

describe('verifyNimiqSignedMessage', () => {
  it('accepts a genuine keypair with a valid signature', () => {
    const keyPair = KeyPair.generate();
    const address = keyPair.publicKey.toAddress().toUserFriendlyAddress();
    const message = 'Sign in to NimCare\nNonce: abc123';
    const signature = sign(keyPair, message);

    const result = verifyNimiqSignedMessage({
      message,
      publicKeyHex: keyPair.publicKey.toHex(),
      signatureHex: signature,
      claimedAddress: address,
    });

    expect(result.ok).toBe(true);
  });

  it('rejects a modified message', () => {
    const keyPair = KeyPair.generate();
    const address = keyPair.publicKey.toAddress().toUserFriendlyAddress();
    const message = 'Sign in to NimCare\nNonce: abc123';
    const signature = sign(keyPair, message);

    const result = verifyNimiqSignedMessage({
      message: message + ' tampered',
      publicKeyHex: keyPair.publicKey.toHex(),
      signatureHex: signature,
      claimedAddress: address,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('bad_signature');
  });

  it('rejects a signature checked against the wrong public key', () => {
    const keyPair = KeyPair.generate();
    const otherKeyPair = KeyPair.generate();
    const message = 'Sign in to NimCare\nNonce: abc123';
    const signature = sign(keyPair, message);

    const result = verifyNimiqSignedMessage({
      message,
      publicKeyHex: otherKeyPair.publicKey.toHex(),
      signatureHex: signature,
      claimedAddress: keyPair.publicKey.toAddress().toUserFriendlyAddress(),
    });

    expect(result.ok).toBe(false);
  });

  it('rejects when the public key does not derive the claimed address', () => {
    const keyPair = KeyPair.generate();
    const otherKeyPair = KeyPair.generate();
    const message = 'Sign in to NimCare\nNonce: abc123';
    const signature = sign(keyPair, message);

    // Valid signature from keyPair, but claiming otherKeyPair's address.
    const result = verifyNimiqSignedMessage({
      message,
      publicKeyHex: keyPair.publicKey.toHex(),
      signatureHex: signature,
      claimedAddress: otherKeyPair.publicKey.toAddress().toUserFriendlyAddress(),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('address_mismatch');
  });

  it('rejects garbage hex input instead of throwing', () => {
    const result = verifyNimiqSignedMessage({
      message: 'hello',
      publicKeyHex: 'not-hex',
      signatureHex: 'also-not-hex',
      claimedAddress: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000 0000',
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_hex');
  });
});
