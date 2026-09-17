# PRD — NimCare

## Definition

NimCare is a Nimiq Pay Mini App that turns small NIM payments into meaningful shared experiences between two people who already know each other, using CareDrops (gift + prompt + sealed note), a paired Loop, and a shared Memory timeline.

Tagline: **Send more than money.**
Supporting line: **Turn a small NIM gift into a moment that matters.**

## Origin and differentiation

Inspired by the reciprocal-intentional-interaction insight in Looop (https://devpost.com/software/looop) — one person completes/sends something meaningful, the other participates, something personal unlocks. NimCare does **not** clone Looop's branding, wording, visuals, or screens. NimCare's mechanism is centered on Nimiq Pay wallet identity, real NIM transactions, and transaction/signature verification — a payment-linked relationship product, not a generic reciprocal-task app.

NimCare must never become: a tipping jar, a bounty/challenge-for-money app, a betting product, a dating app, a generic wallet, a generic messenger, a generic payment link, an AI relationship coach, or a social feed. The NIM is a gift, never compensation for completing a task — the recipient never "earns" it.

## Target users

Primary: long-distance couples, close friends living apart, siblings, family members — people who want more intentional digital relationships with someone they already know. Not a dating app. Relationship types for MVP: Partner, Friend, Family.

## Problem

Payment apps move money without meaning. Messaging apps carry meaning without money. Nothing combines them into a single intentional gesture between two specific people who already have a relationship.

## Job to be done

"Help me turn a small amount of money into a moment my partner/friend/family member will actually feel, and let me know they received and engaged with it."

## Desired outcome

The sender feels their gift was received as a meaningful gesture, not an anonymous transfer. The recipient feels cared for and prompted to share something back. Both retain a growing shared history of these moments.

## Core insight

Wallet-native payment infrastructure (identity, signing, native approval, on-chain verifiability) can carry emotional weight when wrapped around a specific relationship and a specific prompt — the blockchain proves the gift was real without being the point of the product.

## Value proposition

Send more than money: a NIM gift becomes a shared moment through a prompt, a sealed note, a response, and a permanent place in a private timeline with one other person.

## Why Nimiq

Nimiq Pay provides: wallet-native identity (no email/password), native transaction approval UX, real NIM transfers, and verifiable on-chain payment state. Without it, NimCare loses its trust and payment interaction entirely — this is not a bolt-on integration.

## Core product model

- **CareDrop** — the entry mechanic: NIM + prompt + sealed note + response + completion state.
- **Loop** — the paired relationship between two wallets (member A, member B, relationship type, shared history).
- **Memory** — the growing shared timeline of completed CareDrops.

Transaction metadata carries only a minimal reference (e.g. conceptually `NC:D:<id>`, exact encoding pending Spike S3). Private messages are **never** placed on-chain.

## User flows

### Primary: Critical Demo Path

1. Wallet A opens NimCare in Nimiq Pay → SDK inits → A grants account access.
2. A creates or joins a Loop with Wallet B.
3. A selects "Send a CareDrop": template, amount, private note; reviews recipient.
4. NimCare requests a real NIM transaction via Nimiq Pay's native approval UI.
5. A approves; NimCare receives a transaction hash.
6. Backend verifies the transaction from real Nimiq blockchain data (not client-trusted).
7. CareDrop → funded/delivered.
8. Wallet B opens NimCare, sees the CareDrop (gift already belongs to them), prompt, and a locked note.
9. B writes a response and completes the interaction (wallet signature where verified as supported).
10. Backend verifies completion; sealed note unlocks for B.
11. Both see the completed CareDrop in their shared Memory.

### Secondary flows

- Pair invite creation/acceptance (P0.4).
- Settings/privacy screen (minimal).
- P1: Mutual Loop (both submit hidden answers to a shared prompt, unlock simultaneously).

## Scope

### P0 (must ship)

1. Nimiq Pay Mini App integration (`init`, `listAccounts`, `sign`, `sendBasicTransactionWithData`) with full error handling (provider unavailable, init delay, user rejection, permission denied, malformed tx, wallet unavailable, network/consensus issues, verification delay/failure).
2. Wallet-native onboarding, no signup form, shortened address display, never touching private keys.
3. Secure wallet session: nonce challenge → signature → server verification → session (semantics pending Spike S5).
4. Pairing/invite: unpredictable, one-time-where-practical, expiring invite tokens; no usernames required.
5. CareDrop creation: recipient (paired wallet), prompt/template, amount, private note; curated templates ("Coffee on me", "Thinking of you", "Little treat", "Your choice" free text).
6. Real NIM transaction via `sendBasicTransactionWithData()` (or fallback), integer-Luna internal accounting, minimal on-chain reference only.
7. Server-side transaction verification (sender, recipient, amount, reference if available, confirmation state) before marking funded — never trust client-reported success.
8. Recipient CareDrop experience: gift already delivered, prompt visible, note shown as LOCKED, response input.
9. Response + completion: text response (P0), optional wallet-signed completion message, server verifies.
10. Sealed-note reveal after verified completion; never exposed via unauthenticated endpoints.
11. Memory timeline: date, type, sender→recipient, amount, completion status; private content restricted to paired wallets.
12. Polished error/empty/retry states for every P0.12-listed failure mode — never a blank screen.

### P1 (after Critical Demo Path is demo-safe)

Mutual Loop, shareable (privacy-safe) completion cards, display names, relationship streaks (no punishment mechanics), relationship-type-driven prompt curation.

### P2 (do not touch until everything else is finished)

AI coach/prompt generation, voice/video/large images, push notifications, groups/family circles, NFTs, smart contracts, escrow, staking, token incentives, USDT, EVM chains, scheduled capsules, public feed, dating, advanced analytics, gamified tokens, marketplace, recommendation engine, moderation systems.

### Non-goals

No custom smart contract, no NFT, no token launch, no escrow, no gambling/chance mechanics, no pay-for-proof challenge system, no social feed, no dating discovery, no buzzword AI, no multi-chain, no USDT (unless NIM is fully stable and there's a strong reason), no separate native mobile app.

## Acceptance criteria (P0)

- **Wallet connect:** Opening NimCare inside Nimiq Pay triggers SDK `init()`; on success `listAccounts()` returns a real address rendered in shortened form; on rejection/unavailable-provider a specific, non-blank error state is shown with a retry action.
- **Pairing:** Wallet A can create an invite; Wallet B can open it, connect their wallet, and accept; the pair record persists with both addresses, relationship type, and status ACCEPTED; an expired or already-consumed invite shows a clear, specific error (not a generic failure).
- **CareDrop send:** Given a paired recipient, a chosen template or custom prompt, an amount, and a note, submitting triggers a real Nimiq Pay approval request; a user-cancelled approval leaves the CareDrop in a clearly labeled non-funded state with a retry path, never silently "sent."
- **Verification:** A CareDrop is marked funded/delivered only after the backend independently retrieves and checks the transaction (sender, recipient, amount, state) from Nimiq blockchain data; a mismatch or verification failure keeps the CareDrop in a FAILED/PENDING state with an explanit UI, never silently marked funded.
- **Recipient experience:** The recipient sees the gift as already theirs, the prompt, and a note marked LOCKED, with a response field; unauthenticated requests cannot fetch the sealed note or the response.
- **Completion + reveal:** Submitting a response (and signature, once S5 confirms feasibility) transitions the CareDrop to COMPLETED only after backend verification; only then does the sealed note become visible to the recipient, and the memory entry appears for both wallets.
- **Memory:** Both paired wallets can see a chronological list of their completed CareDrops (date, type, direction, amount, status); a third party cannot query this data.
- **Resilience:** Every P0.12 failure scenario (cancel connect, cancel payment, insufficient balance, malformed address, lost network, provider unavailable, pending tx, delayed verification, invalid/expired invite, unauthorized pair access, backend error, empty state) renders a specific, non-blank, on-brand UI state.

## Hackathon success definition

A judge understands the product in under 60 seconds, a Nimiq wallet is meaningfully required, a real NIM payment occurs, the payment creates real product state via genuine blockchain verification, two people interact through the product, the experience feels finished, it works inside Nimiq Pay, failure states don't break the experience, and the repo is public/MIT/documented.

## Product success definition

A pair of real users complete at least one full CareDrop loop (send → verify → respond → reveal → memory) without needing developer intervention.

## Judge explanation (30 seconds)

"NimCare turns NIM payments into meaningful interactions between people. Instead of sending someone a contextless crypto payment, you send a CareDrop — a small gift with a personal prompt and sealed message. Nimiq Pay handles wallet identity, signing and the actual payment. Once the interaction is completed, the private message unlocks and the moment becomes part of your shared memory. The result is a relationship app where blockchain infrastructure stays in the background while Nimiq makes the experience possible."

## Product assumptions

See `PROJECT_PLAN.md` § Assumption Register (technical) — this PRD assumes those technical assumptions resolve favorably enough to preserve the flows above; if a spike fails, the flow's implementation detail (not its product intent) changes per the documented fallback.

## Open questions

- Exact final on-chain reference encoding (pending Spike S3).
- Exact signature verification message format (pending Spike S5).
- Whether physical device testing is available before submission (operational, not product, risk).
