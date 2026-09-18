import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db/index.js';
import { requireSession } from './auth.js';
import { isValidLunaAmount } from '../luna.js';
import { verifyCareDropTransaction, applyVerificationOutcome, type CareDropRow } from '../services/verifyTransaction.js';
import { PROMPT_LIBRARY } from '../prompts.js';

export const caredropsRouter = Router();

function assertPairMember(pair: any, address: string): boolean {
  return pair.member_a_wallet === address || pair.member_b_wallet === address;
}

caredropsRouter.get('/prompts', (_req, res) => {
  res.json({ prompts: PROMPT_LIBRARY });
});

/** Short, on-chain-safe reference. Kept short since the exact byte limit of
 * sendBasicTransactionWithData's data field is unconfirmed (see MEMORY.md). */
function shortRef(id: string): string {
  return `NC:D:${id.replace(/-/g, '').slice(0, 10)}`;
}

caredropsRouter.post('/', requireSession, (req: any, res) => {
  const { pairId, promptId, promptText, amountLuna, sealedNote } = req.body ?? {};
  const pair = db.prepare(`SELECT * FROM pair WHERE id = ?`).get(pairId) as any;
  if (!pair) return res.status(404).json({ error: 'pair_not_found' });
  if (pair.status !== 'ACCEPTED') return res.status(400).json({ error: 'pair_not_accepted' });
  if (!assertPairMember(pair, req.walletAddress)) return res.status(403).json({ error: 'not_a_pair_member' });
  if (!isValidLunaAmount(amountLuna)) return res.status(400).json({ error: 'invalid_amount' });
  if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
    return res.status(400).json({ error: 'missing_prompt_text' });
  }
  if (!sealedNote || typeof sealedNote !== 'string' || !sealedNote.trim()) {
    return res.status(400).json({ error: 'missing_note' });
  }

  const recipientWallet =
    pair.member_a_wallet === req.walletAddress ? pair.member_b_wallet : pair.member_a_wallet;
  if (!recipientWallet) return res.status(400).json({ error: 'pair_has_no_recipient' });

  const id = randomUUID();
  const reference = shortRef(id);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO caredrop
      (id, pair_id, sender_wallet, recipient_wallet, prompt_id, prompt_text, amount_luna, sealed_note, reference, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AWAITING_PAYMENT', ?)`,
  ).run(id, pairId, req.walletAddress, recipientWallet, promptId ?? null, promptText, amountLuna, sealedNote, reference, now);

  res.json({ id, recipient: recipientWallet, amountLuna, reference });
});

caredropsRouter.post('/:id/submit', requireSession, async (req: any, res) => {
  const { txHash } = req.body ?? {};
  if (!txHash || typeof txHash !== 'string') return res.status(400).json({ error: 'missing_tx_hash' });

  const drop = db.prepare(`SELECT * FROM caredrop WHERE id = ?`).get(req.params.id) as any;
  if (!drop) return res.status(404).json({ error: 'caredrop_not_found' });
  if (drop.sender_wallet !== req.walletAddress) return res.status(403).json({ error: 'not_the_sender' });
  if (drop.status !== 'AWAITING_PAYMENT') return res.status(400).json({ error: 'invalid_state_transition' });

  // A transaction hash may only ever back one CareDrop — otherwise the same
  // on-chain payment could be replayed to "fund" a second CareDrop.
  const existing = db.prepare(`SELECT id FROM caredrop WHERE transaction_hash = ?`).get(txHash) as
    | { id: string }
    | undefined;
  if (existing && existing.id !== drop.id) {
    return res.status(409).json({ error: 'transaction_hash_already_used' });
  }

  try {
    db.prepare(
      `UPDATE caredrop SET status = 'PAYMENT_SUBMITTED', transaction_hash = ?, blockchain_verification_status = 'PENDING' WHERE id = ?`,
    ).run(txHash, drop.id);
  } catch (err: any) {
    if (String(err?.message ?? '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'transaction_hash_already_used' });
    }
    throw err;
  }

  res.json({ id: drop.id, status: 'PAYMENT_SUBMITTED' });
});

function serializeCareDrop(drop: any, viewerAddress: string) {
  const isRecipient = drop.recipient_wallet === viewerAddress;
  const noteUnlocked = drop.status === 'COMPLETED';
  return {
    id: drop.id,
    pairId: drop.pair_id,
    senderWallet: drop.sender_wallet,
    recipientWallet: drop.recipient_wallet,
    promptText: drop.prompt_text,
    amountLuna: drop.amount_luna,
    status: drop.status,
    failureReason: drop.failure_reason,
    transactionHash: drop.transaction_hash,
    blockchainVerificationStatus: drop.blockchain_verification_status,
    createdAt: drop.created_at,
    completedAt: drop.completed_at,
    sealedNote: noteUnlocked ? drop.sealed_note : null,
    sealedNoteLocked: isRecipient && !noteUnlocked,
  };
}

caredropsRouter.get('/:id', requireSession, async (req: any, res) => {
  const drop = db.prepare(`SELECT * FROM caredrop WHERE id = ?`).get(req.params.id) as any;
  if (!drop) return res.status(404).json({ error: 'caredrop_not_found' });
  if (drop.sender_wallet !== req.walletAddress && drop.recipient_wallet !== req.walletAddress) {
    return res.status(403).json({ error: 'not_authorized' });
  }

  if (drop.status === 'PAYMENT_SUBMITTED') {
    const outcome = await verifyCareDropTransaction(drop as CareDropRow);
    applyVerificationOutcome(drop.id, outcome);
    const refreshed = db.prepare(`SELECT * FROM caredrop WHERE id = ?`).get(drop.id);
    return res.json({ caredrop: serializeCareDrop(refreshed, req.walletAddress) });
  }

  res.json({ caredrop: serializeCareDrop(drop, req.walletAddress) });
});

caredropsRouter.post('/:id/respond', requireSession, (req: any, res) => {
  const { responseText, completionSignature } = req.body ?? {};
  const drop = db.prepare(`SELECT * FROM caredrop WHERE id = ?`).get(req.params.id) as any;
  if (!drop) return res.status(404).json({ error: 'caredrop_not_found' });
  if (drop.recipient_wallet !== req.walletAddress) return res.status(403).json({ error: 'not_the_recipient' });
  if (!['DELIVERED', 'PAYMENT_VERIFIED'].includes(drop.status)) {
    return res.status(400).json({ error: 'invalid_state_transition' });
  }
  if (!responseText || typeof responseText !== 'string' || !responseText.trim()) {
    return res.status(400).json({ error: 'missing_response_text' });
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO caredrop_response (id, caredrop_id, author_wallet, response_text, completion_signature, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), drop.id, req.walletAddress, responseText, completionSignature ?? null, now);

  db.prepare(`UPDATE caredrop SET status = 'COMPLETED', completed_at = ? WHERE id = ?`).run(now, drop.id);

  const refreshed = db.prepare(`SELECT * FROM caredrop WHERE id = ?`).get(drop.id);
  res.json({ caredrop: serializeCareDrop(refreshed, req.walletAddress) });
});

caredropsRouter.get('/:id/response', requireSession, (req: any, res) => {
  const drop = db.prepare(`SELECT * FROM caredrop WHERE id = ?`).get(req.params.id) as any;
  if (!drop) return res.status(404).json({ error: 'caredrop_not_found' });
  if (drop.sender_wallet !== req.walletAddress && drop.recipient_wallet !== req.walletAddress) {
    return res.status(403).json({ error: 'not_authorized' });
  }
  if (drop.status !== 'COMPLETED') return res.status(403).json({ error: 'not_yet_completed' });

  const response = db
    .prepare(`SELECT response_text, author_wallet, created_at FROM caredrop_response WHERE caredrop_id = ?`)
    .get(drop.id);
  res.json({ response });
});
