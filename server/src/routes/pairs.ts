import { Router } from 'express';
import { nanoid } from 'nanoid';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { requireSession } from './auth.js';
import { isValidNimiqAddress, normalizeAddress } from '../nimiqAddress.js';

export const pairsRouter = Router();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

pairsRouter.post('/invite', requireSession, (req: any, res) => {
  const { relationshipType } = req.body ?? {};
  if (!['PARTNER', 'FRIEND', 'FAMILY'].includes(relationshipType)) {
    return res.status(400).json({ error: 'invalid_relationship_type' });
  }
  const now = new Date();
  const pairId = randomUUID();
  const inviteId = randomUUID();
  const token = nanoid(24);

  db.prepare(
    `INSERT INTO pair (id, member_a_wallet, relationship_type, status, created_at) VALUES (?, ?, ?, 'PENDING', ?)`,
  ).run(pairId, req.walletAddress, relationshipType, now.toISOString());

  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO pair_invite (id, pair_id, token_hash, created_by_wallet, expires_at, status)
     VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
  ).run(inviteId, pairId, hashToken(token), req.walletAddress, expiresAt);

  res.json({ inviteId, pairId, token, expiresAt });
});

pairsRouter.get('/invite/:token', (req, res) => {
  const invite = db
    .prepare(`SELECT * FROM pair_invite WHERE token_hash = ?`)
    .get(hashToken(req.params.token)) as any;

  if (!invite) return res.status(404).json({ error: 'invite_not_found' });
  if (invite.status === 'CONSUMED') return res.status(410).json({ error: 'invite_already_used' });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: 'invite_expired' });
  }

  const pair = db.prepare(`SELECT * FROM pair WHERE id = ?`).get(invite.pair_id) as any;
  res.json({
    pairId: pair.id,
    relationshipType: pair.relationship_type,
    invitedBy: pair.member_a_wallet,
  });
});

pairsRouter.post('/accept', requireSession, (req: any, res) => {
  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ error: 'missing_token' });

  const invite = db.prepare(`SELECT * FROM pair_invite WHERE token_hash = ?`).get(hashToken(token)) as any;
  if (!invite) return res.status(404).json({ error: 'invite_not_found' });
  if (invite.status === 'CONSUMED') return res.status(410).json({ error: 'invite_already_used' });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: 'invite_expired' });
  }

  const pair = db.prepare(`SELECT * FROM pair WHERE id = ?`).get(invite.pair_id) as any;
  if (pair.member_a_wallet === req.walletAddress) {
    return res.status(400).json({ error: 'cannot_accept_own_invite' });
  }
  if (pair.status === 'ACCEPTED') {
    return res.status(410).json({ error: 'pair_already_complete' });
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE pair SET member_b_wallet = ?, status = 'ACCEPTED', paired_at = ? WHERE id = ?`).run(
    req.walletAddress,
    now,
    pair.id,
  );
  db.prepare(`UPDATE pair_invite SET status = 'CONSUMED', consumed_at = ? WHERE id = ?`).run(now, invite.id);

  res.json({ pairId: pair.id, status: 'ACCEPTED' });
});

function assertPairMember(pair: any, address: string): boolean {
  return pair.member_a_wallet === address || pair.member_b_wallet === address;
}

pairsRouter.get('/mine', requireSession, (req: any, res) => {
  const pairs = db
    .prepare(`SELECT * FROM pair WHERE member_a_wallet = ? OR member_b_wallet = ?`)
    .all(req.walletAddress, req.walletAddress);
  res.json({ pairs });
});

pairsRouter.get('/:id', requireSession, (req: any, res) => {
  const pair = db.prepare(`SELECT * FROM pair WHERE id = ?`).get(req.params.id) as any;
  if (!pair) return res.status(404).json({ error: 'pair_not_found' });
  if (!assertPairMember(pair, req.walletAddress)) return res.status(403).json({ error: 'not_a_pair_member' });
  res.json({ pair });
});

pairsRouter.get('/:id/memory', requireSession, (req: any, res) => {
  const pair = db.prepare(`SELECT * FROM pair WHERE id = ?`).get(req.params.id) as any;
  if (!pair) return res.status(404).json({ error: 'pair_not_found' });
  if (!assertPairMember(pair, req.walletAddress)) return res.status(403).json({ error: 'not_a_pair_member' });

  const drops = db
    .prepare(
      `SELECT id, sender_wallet, recipient_wallet, prompt_text, amount_luna, status, created_at, completed_at
       FROM caredrop WHERE pair_id = ? AND status = 'COMPLETED' ORDER BY completed_at DESC`,
    )
    .all(pair.id);
  res.json({ memory: drops });
});

export { assertPairMember, isValidNimiqAddress, normalizeAddress };
