import { Router } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';
import { requireSession } from './auth.js';
import { asyncHandler } from '../asyncHandler.js';
import { isValidLunaAmount } from '../luna.js';
import { isValidNimiqAddress, normalizeAddress } from '../nimiqAddress.js';
import { verifyCareDropTransaction, applyVerificationOutcome, type CareDropRow } from '../services/verifyTransaction.js';
import { PROMPT_LIBRARY } from '../prompts.js';
import { CAREDROP_TYPES, detectMusicProvider } from '../caredropTypes.js';
import { findOrCreateLoop } from './pairs.js';

export const caredropsRouter = Router();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Legacy prompt library kept for backward compatibility with existing rows;
// the new composer drives off CAREDROP_TYPES instead.
caredropsRouter.get('/prompts', (_req, res) => {
  res.json({ prompts: PROMPT_LIBRARY });
});

caredropsRouter.get('/types', (_req, res) => {
  res.json({ types: CAREDROP_TYPES });
});

/** Short, on-chain-safe reference. Kept short since the exact byte limit of
 * sendBasicTransactionWithData's data field is unconfirmed (see MEMORY.md). */
function shortRef(id: string): string {
  return `NC:D:${id.replace(/-/g, '').slice(0, 10)}`;
}

const VALID_TYPES = new Set(['PHOTO', 'PLAYLIST', 'MOVIE', 'TREAT']);

/**
 * Create a CareDrop directly to a recipient wallet — no prior Loop/pair
 * "accept" step required (2026-09-18 pivot). The Loop between sender and
 * recipient is created automatically if it doesn't already exist. The
 * recipient wallet must be known at creation time because real NIM payment
 * requires a destination address — Cashlink (which would defer that) was
 * evaluated and is not viable in the current Mini App SDK, see MEMORY.md.
 */
caredropsRouter.post(
  '/',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const { recipientWallet, type, title, caption, mediaUrl, mediaMime, externalUrl, amountLuna } = req.body ?? {};

    if (!isValidNimiqAddress(recipientWallet)) return res.status(400).json({ error: 'invalid_recipient_address' });
    const recipient = normalizeAddress(recipientWallet);
    if (recipient === req.walletAddress) return res.status(400).json({ error: 'cannot_send_to_self' });
    if (!VALID_TYPES.has(type)) return res.status(400).json({ error: 'invalid_type' });
    if (!isValidLunaAmount(amountLuna)) return res.status(400).json({ error: 'invalid_amount' });

    if (type === 'PHOTO' && !mediaUrl) return res.status(400).json({ error: 'missing_media' });
    if (type === 'PLAYLIST' && !externalUrl) return res.status(400).json({ error: 'missing_external_url' });

    let externalProvider: string | null = null;
    if (externalUrl) {
      if (!/^https:\/\//.test(externalUrl)) return res.status(400).json({ error: 'invalid_external_url' });
      externalProvider = detectMusicProvider(externalUrl);
    }

    const loop = await findOrCreateLoop(req.walletAddress, recipient);

    const id = randomUUID();
    const reference = shortRef(id);
    const shareToken = nanoid(24);
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO caredrop
        (id, pair_id, sender_wallet, recipient_wallet, type, title, caption, media_url, media_mime,
         external_url, external_provider, external_title, amount_luna, sealed_note, reference,
         share_token_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AWAITING_PAYMENT', ?)`,
      [
        id,
        loop.id,
        req.walletAddress,
        recipient,
        type,
        title ?? null,
        caption ?? null,
        mediaUrl ?? null,
        mediaMime ?? null,
        externalUrl ?? null,
        externalProvider,
        title ?? null,
        amountLuna,
        null, // sealed_note is legacy (pre-pivot) and unused going forward; caption is the real field now
        reference,
        hashToken(shareToken),
        now,
      ],
    );

    res.json({ id, recipient, amountLuna, reference, shareToken });
  }),
);

caredropsRouter.post(
  '/:id/submit',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const { txHash } = req.body ?? {};
    if (!txHash || typeof txHash !== 'string') return res.status(400).json({ error: 'missing_tx_hash' });

    const drop = await db.get<any>(`SELECT * FROM caredrop WHERE id = ?`, [req.params.id]);
    if (!drop) return res.status(404).json({ error: 'caredrop_not_found' });
    if (drop.sender_wallet !== req.walletAddress) return res.status(403).json({ error: 'not_the_sender' });
    if (drop.status !== 'AWAITING_PAYMENT') return res.status(400).json({ error: 'invalid_state_transition' });

    // A transaction hash may only ever back one CareDrop — otherwise the same
    // on-chain payment could be replayed to "fund" a second CareDrop.
    const existing = await db.get<{ id: string }>(`SELECT id FROM caredrop WHERE transaction_hash = ?`, [txHash]);
    if (existing && existing.id !== drop.id) {
      return res.status(409).json({ error: 'transaction_hash_already_used' });
    }

    try {
      await db.run(
        `UPDATE caredrop SET status = 'PAYMENT_SUBMITTED', transaction_hash = ?, blockchain_verification_status = 'PENDING' WHERE id = ?`,
        [txHash, drop.id],
      );
    } catch (err: any) {
      if (String(err?.message ?? '').toLowerCase().includes('unique')) {
        return res.status(409).json({ error: 'transaction_hash_already_used' });
      }
      throw err;
    }

    res.json({ id: drop.id, status: 'PAYMENT_SUBMITTED' });
  }),
);

function serializeCareDrop(drop: any, _viewerAddress: string) {
  return {
    id: drop.id,
    pairId: drop.pair_id,
    senderWallet: drop.sender_wallet,
    recipientWallet: drop.recipient_wallet,
    type: drop.type,
    title: drop.title,
    // The caption is part of the reveal itself, visible as soon as the
    // recipient opens the CareDrop — there is no "locked note" gate in the
    // pivoted model. Only the on-chain gift itself is gated on real
    // verification (see blockchainVerificationStatus).
    caption: drop.caption,
    mediaUrl: drop.media_url,
    mediaMime: drop.media_mime,
    externalUrl: drop.external_url,
    externalProvider: drop.external_provider,
    amountLuna: drop.amount_luna,
    status: drop.status,
    failureReason: drop.failure_reason,
    transactionHash: drop.transaction_hash,
    blockchainVerificationStatus: drop.blockchain_verification_status,
    createdAt: drop.created_at,
    openedAt: drop.opened_at,
    completedAt: drop.completed_at,
  };
}

async function verifyIfPending(drop: any) {
  if (drop.status !== 'PAYMENT_SUBMITTED') return drop;
  const outcome = await verifyCareDropTransaction(drop as CareDropRow);
  await applyVerificationOutcome(drop.id, outcome);
  return db.get<any>(`SELECT * FROM caredrop WHERE id = ?`, [drop.id]);
}

caredropsRouter.get(
  '/:id',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const drop = await db.get<any>(`SELECT * FROM caredrop WHERE id = ?`, [req.params.id]);
    if (!drop) return res.status(404).json({ error: 'caredrop_not_found' });
    if (drop.sender_wallet !== req.walletAddress && drop.recipient_wallet !== req.walletAddress) {
      return res.status(403).json({ error: 'not_authorized' });
    }
    const refreshed = await verifyIfPending(drop);
    res.json({ caredrop: serializeCareDrop(refreshed, req.walletAddress) });
  }),
);

/**
 * Opens a CareDrop by its share link token. The recipient wallet is fixed
 * at creation time (see comment on POST / above) — this endpoint checks the
 * authenticated wallet against it rather than binding on first-open, since
 * there is no NULL-recipient race to resolve without Cashlink support. A
 * wallet that isn't the intended recipient (and isn't the sender) gets a
 * clean 403, not a leak of the CareDrop's content.
 */
caredropsRouter.get(
  '/by-token/:token',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const drop = await db.get<any>(`SELECT * FROM caredrop WHERE share_token_hash = ?`, [hashToken(req.params.token)]);
    if (!drop) return res.status(404).json({ error: 'caredrop_not_found' });
    if (drop.sender_wallet !== req.walletAddress && drop.recipient_wallet !== req.walletAddress) {
      return res.status(403).json({ error: 'not_the_recipient' });
    }

    if (drop.recipient_wallet === req.walletAddress && !drop.opened_at) {
      await db.run(`UPDATE caredrop SET opened_at = ? WHERE id = ?`, [new Date().toISOString(), drop.id]);
      drop.opened_at = new Date().toISOString();
    }

    const refreshed = await verifyIfPending(drop);
    res.json({ caredrop: serializeCareDrop(refreshed, req.walletAddress) });
  }),
);

caredropsRouter.post(
  '/:id/respond',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const { responseText, completionSignature } = req.body ?? {};
    const drop = await db.get<any>(`SELECT * FROM caredrop WHERE id = ?`, [req.params.id]);
    if (!drop) return res.status(404).json({ error: 'caredrop_not_found' });
    if (drop.recipient_wallet !== req.walletAddress) return res.status(403).json({ error: 'not_the_recipient' });
    if (!['DELIVERED', 'PAYMENT_VERIFIED'].includes(drop.status)) {
      return res.status(400).json({ error: 'invalid_state_transition' });
    }
    if (!responseText || typeof responseText !== 'string' || !responseText.trim()) {
      return res.status(400).json({ error: 'missing_response_text' });
    }

    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO caredrop_response (id, caredrop_id, author_wallet, response_text, completion_signature, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), drop.id, req.walletAddress, responseText, completionSignature ?? null, now],
    );

    await db.run(`UPDATE caredrop SET status = 'COMPLETED', completed_at = ? WHERE id = ?`, [now, drop.id]);

    const refreshed = await db.get<any>(`SELECT * FROM caredrop WHERE id = ?`, [drop.id]);
    res.json({ caredrop: serializeCareDrop(refreshed, req.walletAddress) });
  }),
);

caredropsRouter.get(
  '/:id/response',
  requireSession,
  asyncHandler(async (req: any, res) => {
    const drop = await db.get<any>(`SELECT * FROM caredrop WHERE id = ?`, [req.params.id]);
    if (!drop) return res.status(404).json({ error: 'caredrop_not_found' });
    if (drop.sender_wallet !== req.walletAddress && drop.recipient_wallet !== req.walletAddress) {
      return res.status(403).json({ error: 'not_authorized' });
    }
    if (drop.status !== 'COMPLETED') return res.status(403).json({ error: 'not_yet_completed' });

    const response = await db.get(
      `SELECT response_text, author_wallet, created_at FROM caredrop_response WHERE caredrop_id = ?`,
      [drop.id],
    );
    res.json({ response });
  }),
);
