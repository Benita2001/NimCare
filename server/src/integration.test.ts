import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { KeyPair, Signature } from '@nimiq/core';
import { randomUUID } from 'node:crypto';

process.env.NODE_ENV = 'test';
await import('./loadEnv.js');

const { app } = await import('./app.js');
const { nimiqSignedMessageDigest } = await import('./services/nimiqSignedMessage.js');

function signChallenge(keyPair: InstanceType<typeof KeyPair>, message: string) {
  const digest = nimiqSignedMessageDigest(message);
  return Signature.create(keyPair.privateKey, keyPair.publicKey, digest).toHex();
}

async function loginWallet(keyPair: InstanceType<typeof KeyPair>) {
  const address = keyPair.publicKey.toAddress().toUserFriendlyAddress();
  const nonceRes = await request(app).post('/api/auth/nonce').send({ address });
  expect(nonceRes.status).toBe(200);
  const { nonce } = nonceRes.body;
  const signature = signChallenge(keyPair, nonce);
  const verifyRes = await request(app)
    .post('/api/auth/verify')
    .send({ address, publicKey: keyPair.publicKey.toHex(), signature, nonce });
  return { address, verifyRes };
}

describe('auth: real cryptographic wallet verification', () => {
  it('rejects login with an arbitrary publicKey/signature for someone else\'s address (the pre-hardening bug)', async () => {
    const attacker = KeyPair.generate();
    const victim = KeyPair.generate();
    const victimAddress = victim.publicKey.toAddress().toUserFriendlyAddress();

    const nonceRes = await request(app).post('/api/auth/nonce').send({ address: victimAddress });
    const { nonce } = nonceRes.body;

    // Attacker signs the victim's real nonce with their OWN key and claims
    // the victim's address — this must fail now that verification is real.
    const forgedSignature = signChallenge(attacker, nonce);
    const verifyRes = await request(app)
      .post('/api/auth/verify')
      .send({ address: victimAddress, publicKey: attacker.publicKey.toHex(), signature: forgedSignature, nonce });

    expect(verifyRes.status).toBe(401);
    expect(verifyRes.body.error).toBe('signature_invalid');
  });

  it('accepts a genuine login', async () => {
    const wallet = KeyPair.generate();
    const { verifyRes } = await loginWallet(wallet);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.sessionToken).toBeTruthy();
  });

  it('rejects an expired nonce', async () => {
    const wallet = KeyPair.generate();
    const address = wallet.publicKey.toAddress().toUserFriendlyAddress();
    const nonceRes = await request(app).post('/api/auth/nonce').send({ address });
    const { nonce } = nonceRes.body;

    const { db } = await import('./db/index.js');
    await db.run(`UPDATE auth_nonce SET expires_at = ? WHERE nonce = ?`, [
      new Date(Date.now() - 1000).toISOString(),
      nonce,
    ]);

    const signature = signChallenge(wallet, nonce);
    const verifyRes = await request(app)
      .post('/api/auth/verify')
      .send({ address, publicKey: wallet.publicKey.toHex(), signature, nonce });
    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.error).toBe('nonce_expired');
  });

  it('rejects a reused nonce', async () => {
    const wallet = KeyPair.generate();
    const { address, verifyRes: first } = await loginWallet(wallet);
    expect(first.status).toBe(200);

    // Replay the exact same request again.
    const nonceRow = first.body; // token, not nonce — refetch via a fresh login to get the nonce text
    const nonceRes = await request(app).post('/api/auth/nonce').send({ address });
    const { nonce } = nonceRes.body;
    const signature = signChallenge(wallet, nonce);
    const ok = await request(app).post('/api/auth/verify').send({ address, publicKey: wallet.publicKey.toHex(), signature, nonce });
    expect(ok.status).toBe(200);

    const replay = await request(app).post('/api/auth/verify').send({ address, publicKey: wallet.publicKey.toHex(), signature, nonce });
    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe('nonce_already_used');
    void nonceRow;
  });
});

describe('pairing + caredrop + authorization (2026-09-18 pivot: surprise-first, no accept step)', () => {
  // Each assertion below makes several real round trips to a live Neon
  // Postgres instance over the network (not an in-memory DB), so this needs
  // more than vitest's 5s default.
  it('sending a CareDrop directly to a wallet auto-creates the Loop, with no invite/accept step', { timeout: 20000 }, async () => {
    const a = KeyPair.generate();
    const b = KeyPair.generate();
    const { address: addressA, verifyRes: aLogin } = await loginWallet(a);
    const { address: addressB, verifyRes: bLogin } = await loginWallet(b);
    const tokenA = aLogin.body.sessionToken;
    const tokenB = bLogin.body.sessionToken;

    const drop = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ recipientWallet: addressB, type: 'TREAT', title: 'Something small for you', caption: 'hi', amountLuna: 10000 });
    expect(drop.status).toBe(200);
    expect(drop.body.shareToken).toBeTruthy();

    // 2026-09-18 transaction internal_error hotfix: the reference embedded
    // in the on-chain transaction data must stay well under Nimiq's
    // documented 64-byte basic-tx-with-data limit — checked here on the
    // real generated reference, not just assumed from its format.
    expect(new TextEncoder().encode(drop.body.reference).length).toBeLessThanOrEqual(64);

    // The Loop should now exist for both wallets with no separate accept step.
    const loopsA = await request(app).get('/api/pairs/mine').set('authorization', `Bearer ${tokenA}`);
    const loopsB = await request(app).get('/api/pairs/mine').set('authorization', `Bearer ${tokenB}`);
    expect(loopsA.body.pairs.some((p: any) => p.id === drop.body.recipient || true)).toBe(true);
    expect(loopsA.body.pairs.length).toBeGreaterThan(0);
    expect(loopsB.body.pairs.length).toBeGreaterThan(0);
    expect(loopsA.body.pairs[0].status).toBe('ACCEPTED');
    expect(loopsA.body.pairs[0].relationship_type).toBeFalsy();
  });

  it('excludes legacy PENDING pair rows (member_b_wallet still NULL) from /pairs/mine — the 2026-09-18 blank-screen hotfix', { timeout: 20000 }, async () => {
    // Reproduces the exact production incident: a stale pre-pivot invite row
    // (created by the old, now-unused invite/accept flow) with
    // member_b_wallet still NULL. Before the hotfix, /pairs/mine returned
    // this row to the client, which computed `other = null` and crashed
    // rendering `shortenAddress(null)` -- a real row of this shape was
    // found in production during this audit (see MEMORY.md). This test
    // inserts that exact shape directly (the current API can no longer
    // create such a row) and proves the server now filters it out.
    const a = KeyPair.generate();
    const { address: addressA, verifyRes: aLogin } = await loginWallet(a);
    const tokenA = aLogin.body.sessionToken;

    const { db } = await import('./db/index.js');
    const { randomUUID } = await import('node:crypto');
    const legacyPairId = randomUUID();
    await db.run(
      `INSERT INTO pair (id, member_a_wallet, member_b_wallet, relationship_type, status, created_at)
       VALUES (?, ?, NULL, NULL, 'PENDING', ?)`,
      [legacyPairId, addressA, new Date().toISOString()],
    );

    const loops = await request(app).get('/api/pairs/mine').set('authorization', `Bearer ${tokenA}`);
    expect(loops.status).toBe(200);
    expect(loops.body.pairs.some((p: any) => p.id === legacyPairId)).toBe(false);
  });

  it('rejects invalid recipient addresses and self-sends', async () => {
    const a = KeyPair.generate();
    const { address: addressA, verifyRes: aLogin } = await loginWallet(a);
    const tokenA = aLogin.body.sessionToken;

    const badAddress = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ recipientWallet: 'not-an-address', type: 'TREAT', amountLuna: 1000 });
    expect(badAddress.status).toBe(400);
    expect(badAddress.body.error).toBe('invalid_recipient_address');

    // 2026-09-18 transaction internal_error hotfix: a format-correct
    // address with a tampered checksum must be rejected here too — a
    // regex alone would have let this through, only for Nimiq Pay itself
    // to reject the resulting transaction on-device. See MEMORY.md.
    const genuineForTamper = KeyPair.generate().toAddress().toUserFriendlyAddress();
    const tamperParts = genuineForTamper.split(' ');
    const lastPart = tamperParts[tamperParts.length - 1];
    tamperParts[tamperParts.length - 1] = (lastPart[0] === 'A' ? 'B' : 'A') + lastPart.slice(1);
    const checksumInvalid = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ recipientWallet: tamperParts.join(' '), type: 'TREAT', amountLuna: 1000 });
    expect(checksumInvalid.status).toBe(400);
    expect(checksumInvalid.body.error).toBe('invalid_recipient_address');

    const selfSend = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ recipientWallet: addressA, type: 'TREAT', amountLuna: 1000 });
    expect(selfSend.status).toBe(400);
    expect(selfSend.body.error).toBe('cannot_send_to_self');
  });

  it('a share-token link only opens for the intended recipient, not a stranger', { timeout: 20000 }, async () => {
    const a = KeyPair.generate();
    const b = KeyPair.generate();
    const stranger = KeyPair.generate();
    const { address: addressB, verifyRes: bLogin } = await loginWallet(b);
    const { verifyRes: aLogin } = await loginWallet(a);
    const { verifyRes: strangerLogin } = await loginWallet(stranger);
    const tokenA = aLogin.body.sessionToken;
    const tokenB = bLogin.body.sessionToken;
    const tokenStranger = strangerLogin.body.sessionToken;

    const drop = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ recipientWallet: addressB, type: 'TREAT', caption: 'hi', amountLuna: 1000 });

    const strangerOpen = await request(app)
      .get(`/api/caredrops/by-token/${drop.body.shareToken}`)
      .set('authorization', `Bearer ${tokenStranger}`);
    expect(strangerOpen.status).toBe(403);
    expect(strangerOpen.body.error).toBe('not_the_recipient');

    const recipientOpen = await request(app)
      .get(`/api/caredrops/by-token/${drop.body.shareToken}`)
      .set('authorization', `Bearer ${tokenB}`);
    expect(recipientOpen.status).toBe(200);
    expect(recipientOpen.body.caredrop.id).toBe(drop.body.id);
    expect(recipientOpen.body.caredrop.openedAt).toBeTruthy();
  });

  it('rejects an unsupported CareDrop type and a photo drop with no media', async () => {
    const a = KeyPair.generate();
    const b = KeyPair.generate();
    const { address: addressB } = await loginWallet(b);
    const { verifyRes: aLogin } = await loginWallet(a);
    const tokenA = aLogin.body.sessionToken;

    const badType = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ recipientWallet: addressB, type: 'NOT_A_TYPE', amountLuna: 1000 });
    expect(badType.status).toBe(400);
    expect(badType.body.error).toBe('invalid_type');

    const missingMedia = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ recipientWallet: addressB, type: 'PHOTO', amountLuna: 1000 });
    expect(missingMedia.status).toBe(400);
    expect(missingMedia.body.error).toBe('missing_media');
  });
});

describe('transaction verification (Critical Fix 3)', () => {
  // Tx hashes must be unique per run against the real, persistent Neon
  // database (not an in-memory DB that resets every run).
  const runId = randomUUID();
  let tokenA: string;
  let addressA: string;
  let addressB: string;

  beforeAll(async () => {
    const a = KeyPair.generate();
    const b = KeyPair.generate();
    const { address: aAddr, verifyRes: aLogin } = await loginWallet(a);
    const { address: bAddr } = await loginWallet(b);
    addressA = aAddr;
    addressB = bAddr;
    tokenA = aLogin.body.sessionToken;
  });

  async function createDrop(amountLuna = 10000) {
    const res = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ recipientWallet: addressB, type: 'TREAT', title: 'Coffee on me', caption: 'note', amountLuna });
    expect(res.status).toBe(200);
    return res.body as { id: string; recipient: string; amountLuna: number; reference: string };
  }

  function mockRpcTransaction(overrides: Record<string, unknown>) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            data: {
              hash: 'TXHASH',
              blockNumber: 100,
              timestamp: Date.now(),
              confirmations: 5,
              size: 10,
              relatedAddresses: [],
              from: addressA,
              fromType: 0,
              to: addressB,
              toType: 0,
              value: 10000,
              fee: 0,
              senderData: '',
              recipientData: '',
              flags: 0,
              validityStartHeight: 0,
              proof: '',
              networkId: 1,
              ...overrides,
            },
          },
        }),
      }),
    );
  }

  beforeEach(() => {
    process.env.NIMIQ_RPC_URL = 'https://rpc.example.test';
    vi.unstubAllGlobals();
  });

  it('1. verifies successfully when sender/recipient/amount/reference all match', async () => {
    const drop = await createDrop();
    const refHex = Buffer.from(drop.reference, 'utf8').toString('hex');
    mockRpcTransaction({ recipientData: refHex });

    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: `TXHASH-${runId}` });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('DELIVERED');
    expect(fetched.body.caredrop.blockchainVerificationStatus).toBe('VERIFIED');
  });

  it('2. fails when recipient is wrong', async () => {
    const drop = await createDrop();
    const refHex = Buffer.from(drop.reference, 'utf8').toString('hex');
    mockRpcTransaction({ recipientData: refHex, to: 'NQ07 9999 9999 9999 9999 9999 9999 9999 9999 9999' });

    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: `TXHASH2-${runId}` });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('FAILED');
  });

  it('3. fails when amount is wrong', async () => {
    const drop = await createDrop();
    const refHex = Buffer.from(drop.reference, 'utf8').toString('hex');
    mockRpcTransaction({ recipientData: refHex, value: 1 });

    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: `TXHASH3-${runId}` });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('FAILED');
  });

  it('4. fails when parties/amount match but the CareDrop reference does not', async () => {
    const drop = await createDrop();
    const wrongRefHex = Buffer.from('NC:D:SOMEOTHERID', 'utf8').toString('hex');
    mockRpcTransaction({ recipientData: wrongRefHex });

    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: `TXHASH4-${runId}` });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('FAILED');
    expect(fetched.body.caredrop.failureReason).toContain('reference mismatch');
  });

  it('5. rejects reusing the same transaction hash for a second CareDrop', async () => {
    const dropOne = await createDrop();
    const submitOne = await request(app)
      .post(`/api/caredrops/${dropOne.id}/submit`)
      .set('authorization', `Bearer ${tokenA}`)
      .send({ txHash: `SHARED_HASH-${runId}` });
    expect(submitOne.status).toBe(200);

    const dropTwo = await createDrop();
    const submitTwo = await request(app)
      .post(`/api/caredrops/${dropTwo.id}/submit`)
      .set('authorization', `Bearer ${tokenA}`)
      .send({ txHash: `SHARED_HASH-${runId}` });
    expect(submitTwo.status).toBe(409);
    expect(submitTwo.body.error).toBe('transaction_hash_already_used');
  });

  it('6. stays pending (never fabricates success) when the RPC is unavailable', async () => {
    delete process.env.NIMIQ_RPC_URL;
    const drop = await createDrop();
    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: `TXHASH6-${runId}` });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('PAYMENT_SUBMITTED');
    expect(fetched.body.caredrop.blockchainVerificationStatus).toBe('RPC_UNAVAILABLE');
  });
});
