import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { KeyPair, Signature } from '@nimiq/core';

process.env.DATABASE_PATH = ':memory:';
process.env.NODE_ENV = 'test';

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
    db.prepare(`UPDATE auth_nonce SET expires_at = ? WHERE nonce = ?`).run(
      new Date(Date.now() - 1000).toISOString(),
      nonce,
    );

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

describe('pairing + caredrop + authorization', () => {
  it('rejects creating a CareDrop by a non-pair-member, and reused invite tokens', async () => {
    const a = KeyPair.generate();
    const b = KeyPair.generate();
    const stranger = KeyPair.generate();

    const { verifyRes: aLogin } = await loginWallet(a);
    const { verifyRes: bLogin } = await loginWallet(b);
    const { verifyRes: strangerLogin } = await loginWallet(stranger);
    const tokenA = aLogin.body.sessionToken;
    const tokenB = bLogin.body.sessionToken;
    const tokenStranger = strangerLogin.body.sessionToken;

    const invite = await request(app)
      .post('/api/pairs/invite')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ relationshipType: 'FRIEND' });
    expect(invite.status).toBe(200);

    const accept = await request(app)
      .post('/api/pairs/accept')
      .set('authorization', `Bearer ${tokenB}`)
      .send({ token: invite.body.token });
    expect(accept.status).toBe(200);

    // Reusing the same invite token again must fail.
    const reuse = await request(app)
      .post('/api/pairs/accept')
      .set('authorization', `Bearer ${tokenStranger}`)
      .send({ token: invite.body.token });
    expect(reuse.status).toBe(410);
    expect(reuse.body.error).toBe('invite_already_used');

    // A stranger cannot create a CareDrop on this pair.
    const forgedDrop = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenStranger}`)
      .send({
        pairId: invite.body.pairId,
        promptText: 'hi',
        amountLuna: 10000,
        sealedNote: 'note',
      });
    expect(forgedDrop.status).toBe(403);
  });
});

describe('transaction verification (Critical Fix 3)', () => {
  let tokenA: string;
  let tokenB: string;
  let addressA: string;
  let addressB: string;
  let pairId: string;

  beforeAll(async () => {
    const a = KeyPair.generate();
    const b = KeyPair.generate();
    const { address: aAddr, verifyRes: aLogin } = await loginWallet(a);
    const { address: bAddr, verifyRes: bLogin } = await loginWallet(b);
    addressA = aAddr;
    addressB = bAddr;
    tokenA = aLogin.body.sessionToken;
    tokenB = bLogin.body.sessionToken;

    const invite = await request(app).post('/api/pairs/invite').set('authorization', `Bearer ${tokenA}`).send({ relationshipType: 'FRIEND' });
    const accept = await request(app).post('/api/pairs/accept').set('authorization', `Bearer ${tokenB}`).send({ token: invite.body.token });
    pairId = accept.body.pairId;
  });

  async function createDrop(amountLuna = 10000) {
    const res = await request(app)
      .post('/api/caredrops')
      .set('authorization', `Bearer ${tokenA}`)
      .send({ pairId, promptText: 'Coffee on me', amountLuna, sealedNote: 'note' });
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

    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: 'TXHASH' });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('DELIVERED');
    expect(fetched.body.caredrop.blockchainVerificationStatus).toBe('VERIFIED');
  });

  it('2. fails when recipient is wrong', async () => {
    const drop = await createDrop();
    const refHex = Buffer.from(drop.reference, 'utf8').toString('hex');
    mockRpcTransaction({ recipientData: refHex, to: 'NQ07 9999 9999 9999 9999 9999 9999 9999 9999 9999' });

    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: 'TXHASH2' });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('FAILED');
  });

  it('3. fails when amount is wrong', async () => {
    const drop = await createDrop();
    const refHex = Buffer.from(drop.reference, 'utf8').toString('hex');
    mockRpcTransaction({ recipientData: refHex, value: 1 });

    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: 'TXHASH3' });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('FAILED');
  });

  it('4. fails when parties/amount match but the CareDrop reference does not', async () => {
    const drop = await createDrop();
    const wrongRefHex = Buffer.from('NC:D:SOMEOTHERID', 'utf8').toString('hex');
    mockRpcTransaction({ recipientData: wrongRefHex });

    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: 'TXHASH4' });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('FAILED');
    expect(fetched.body.caredrop.failureReason).toContain('reference mismatch');
  });

  it('5. rejects reusing the same transaction hash for a second CareDrop', async () => {
    const dropOne = await createDrop();
    const submitOne = await request(app)
      .post(`/api/caredrops/${dropOne.id}/submit`)
      .set('authorization', `Bearer ${tokenA}`)
      .send({ txHash: 'SHARED_HASH' });
    expect(submitOne.status).toBe(200);

    const dropTwo = await createDrop();
    const submitTwo = await request(app)
      .post(`/api/caredrops/${dropTwo.id}/submit`)
      .set('authorization', `Bearer ${tokenA}`)
      .send({ txHash: 'SHARED_HASH' });
    expect(submitTwo.status).toBe(409);
    expect(submitTwo.body.error).toBe('transaction_hash_already_used');
  });

  it('6. stays pending (never fabricates success) when the RPC is unavailable', async () => {
    delete process.env.NIMIQ_RPC_URL;
    const drop = await createDrop();
    await request(app).post(`/api/caredrops/${drop.id}/submit`).set('authorization', `Bearer ${tokenA}`).send({ txHash: 'TXHASH6' });
    const fetched = await request(app).get(`/api/caredrops/${drop.id}`).set('authorization', `Bearer ${tokenA}`);
    expect(fetched.body.caredrop.status).toBe('PAYMENT_SUBMITTED');
    expect(fetched.body.caredrop.blockchainVerificationStatus).toBe('RPC_UNAVAILABLE');
  });
});
