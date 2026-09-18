import { Router } from 'express';
import { nanoid } from 'nanoid';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { requireSession } from './auth.js';
import { asyncHandler } from '../asyncHandler.js';

export const pairsRouter = Router();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

pairsRouter.post(
  '/invite',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const { relationshipType } = req.body ?? {};
    if (!['PARTNER', 'FRIEND', 'FAMILY'].includes(relationshipType)) {
      return res.status(400).json({ error: 'invalid_relationship_type' });
    }
    const now = new Date();
    const pairId = randomUUID();
    const inviteId = randomUUID();
    const token = nanoid(24);

    await db.run(
      `INSERT INTO pair (id, member_a_wallet, relationship_type, status, created_at) VALUES (?, ?, ?, 'PENDING', ?)`,
      [pairId, req.walletAddress, relationshipType, now.toISOString()],
    );

    const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
    await db.run(
      `INSERT INTO pair_invite (id, pair_id, token_hash, created_by_wallet, expires_at, status)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
      [inviteId, pairId, hashToken(token), req.walletAddress, expiresAt],
    );

    res.json({ inviteId, pairId, token, expiresAt });
  }),
);

pairsRouter.get(
  '/invite/:token',
  asyncHandler(async (req, res) => {
    const invite = await db.get<any>(`SELECT * FROM pair_invite WHERE token_hash = ?`, [
      hashToken(req.params.token),
    ]);

    if (!invite) return res.status(404).json({ error: 'invite_not_found' });
    if (invite.status === 'CONSUMED') return res.status(410).json({ error: 'invite_already_used' });
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'invite_expired' });
    }

    const pair = await db.get<any>(`SELECT * FROM pair WHERE id = ?`, [invite.pair_id]);
    res.json({
      pairId: pair.id,
      relationshipType: pair.relationship_type,
      invitedBy: pair.member_a_wallet,
    });
  }),
);

pairsRouter.post(
  '/accept',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const { token } = req.body ?? {};
    if (!token) return res.status(400).json({ error: 'missing_token' });

    const invite = await db.get<any>(`SELECT * FROM pair_invite WHERE token_hash = ?`, [hashToken(token)]);
    if (!invite) return res.status(404).json({ error: 'invite_not_found' });
    if (invite.status === 'CONSUMED') return res.status(410).json({ error: 'invite_already_used' });
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'invite_expired' });
    }

    const pair = await db.get<any>(`SELECT * FROM pair WHERE id = ?`, [invite.pair_id]);
    if (pair.member_a_wallet === req.walletAddress) {
      return res.status(400).json({ error: 'cannot_accept_own_invite' });
    }
    if (pair.status === 'ACCEPTED') {
      return res.status(410).json({ error: 'pair_already_complete' });
    }

    const now = new Date().toISOString();
    await db.run(`UPDATE pair SET member_b_wallet = ?, status = 'ACCEPTED', paired_at = ? WHERE id = ?`, [
      req.walletAddress,
      now,
      pair.id,
    ]);
    await db.run(`UPDATE pair_invite SET status = 'CONSUMED', consumed_at = ? WHERE id = ?`, [now, invite.id]);

    res.json({ pairId: pair.id, status: 'ACCEPTED' });
  }),
);

function assertPairMember(pair: any, address: string): boolean {
  return pair.member_a_wallet === address || pair.member_b_wallet === address;
}

/**
 * 2026-09-18 pivot: a Loop (pair) now forms automatically the first time two
 * wallets exchange a CareDrop — no invite/accept step. relationship_type is
 * left NULL since nobody is asked to classify the relationship up front.
 */
export async function findOrCreateLoop(walletA: string, walletB: string): Promise<{ id: string }> {
  const existing = await db.get<{ id: string }>(
    `SELECT id FROM pair WHERE (member_a_wallet = ? AND member_b_wallet = ?) OR (member_a_wallet = ? AND member_b_wallet = ?)`,
    [walletA, walletB, walletB, walletA],
  );
  if (existing) return existing;

  const id = randomUUID();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO pair (id, member_a_wallet, member_b_wallet, relationship_type, status, created_at, paired_at)
     VALUES (?, ?, ?, NULL, 'ACCEPTED', ?, ?)`,
    [id, walletA, walletB, now, now],
  );
  return { id };
}

pairsRouter.get(
  '/mine',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const pairs = await db.all(`SELECT * FROM pair WHERE member_a_wallet = ? OR member_b_wallet = ?`, [
      req.walletAddress,
      req.walletAddress,
    ]);
    res.json({ pairs });
  }),
);

pairsRouter.get(
  '/:id',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const pair = await db.get<any>(`SELECT * FROM pair WHERE id = ?`, [req.params.id]);
    if (!pair) return res.status(404).json({ error: 'pair_not_found' });
    if (!assertPairMember(pair, req.walletAddress)) return res.status(403).json({ error: 'not_a_pair_member' });
    res.json({ pair });
  }),
);

pairsRouter.get(
  '/:id/memory',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const pair = await db.get<any>(`SELECT * FROM pair WHERE id = ?`, [req.params.id]);
    if (!pair) return res.status(404).json({ error: 'pair_not_found' });
    if (!assertPairMember(pair, req.walletAddress)) return res.status(403).json({ error: 'not_a_pair_member' });

    // The Loop's moment history: anything genuinely delivered or completed —
    // i.e. real, verified moments — not drafts or failed attempts.
    const drops = await db.all(
      `SELECT id, sender_wallet, recipient_wallet, type, title, caption, media_url, amount_luna, status, created_at, completed_at
       FROM caredrop WHERE pair_id = ? AND status IN ('DELIVERED', 'COMPLETED') ORDER BY created_at DESC`,
      [pair.id],
    );
    res.json({ memory: drops });
  }),
);
