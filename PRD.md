# PRD — NimCare

> **2026-09-18 pivot notice**: this document was rewritten for the surprise-first media CareDrop pivot. The prior text-prompt-only model, and the mandatory "create Loop → invite → accept" flow before a CareDrop could be sent, are superseded. See `MEMORY.md` for the full pivot rationale and the Cashlink spike's evidence-based FAIL verdict. Checkpoint before the pivot: git tag `pre-media-caredrop-pivot`.

## Definition

NimCare is a Nimiq Pay Mini App that turns small NIM payments into meaningful digital surprises. A **CareDrop** is a media-rich moment (a photo, a song/playlist link, a movie-night gift, or a small treat) with a little NIM attached, sent directly to a specific wallet. The recipient doesn't have to accept a relationship or complete any setup before receiving it — they open a link, authenticate their wallet, and the surprise reveals immediately. The private history of CareDrops two wallets exchange forms a **Loop** automatically, with no separate pairing step.

Tagline: **Send a moment, not just money.**
Supporting line: **Turn a little NIM into something they'll remember.**
Alternative line: **Make their day.**

## Core principle: surprise first, Loop second

The old model required the recipient to "accept a relationship" before any CareDrop could exist. That barrier is gone. **CareDrop gets their attention. The moment creates the emotion. The Loop keeps the connection going.**

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

Send a moment, not just money: a photo, a song, a movie-night gift, or a small treat — with a little NIM attached — sent directly to someone, revealed the moment they open it, no relationship setup required first.

## Why Nimiq

Nimiq Pay provides: wallet-native identity (no email/password), native transaction approval UX, real NIM transfers, and verifiable on-chain payment state. Without it, NimCare loses its trust and payment interaction entirely — this is not a bolt-on integration.

## Core product model

- **CareDrop** — one meaningful surprise: a type (Photo/Playlist/Movie/Treat), its media/content, an optional caption, and NIM attached — sent directly to a recipient wallet.
- **Moment** — what the CareDrop contains (the photo, the song link, the movie card, the treat).
- **Loop** — the private chain of moments between two wallets, created automatically the first time they exchange a CareDrop. No relationship-type question, no accept step.

Transaction metadata carries only a minimal reference (`NC:D:<id>`). Private content (captions, photos, responses) is **never** placed on-chain.

## User flows

### Primary: Critical Demo Path

**Sender**
1. Opens NimCare in Nimiq Pay → wallet-native login (real signature verification).
2. Taps a CareDrop type (e.g. "I was thinking of you").
3. Adds the content (photo upload / music link / movie card / caption).
4. Picks a recipient — an existing Loop, or a new wallet address.
5. Picks an amount.
6. Approves the real NIM transaction through Nimiq Pay's native approval UI.
7. Gets a shareable surprise link.

**Recipient**
8. Opens the link (ideally via a Nimiq Pay deeplink; a plain browser gets a conversion screen).
9. Authenticates their wallet.
10. Sees "A CareDrop found you" → taps "Open surprise."
11. The media reveals — the gift is already theirs; the backend has independently verified the transaction against real Nimiq blockchain data before this reveal shows a delivered state.
12. Responds (optional).
13. Both see the moment in their shared Loop, formed automatically — no separate accept step ever happened.

### Secondary flows

- "Send one back" — reciprocity shortcut from a completed CareDrop, prefilling the original sender as recipient.
- Settings/privacy screen (minimal).
- P1: Mutual Loop (both submit hidden answers to a shared prompt, unlock simultaneously); legacy invite/accept endpoints remain in the API for backward compatibility but are not part of the primary UX.

## Scope

### P0 (must ship)

1. Nimiq Pay Mini App integration (`init`, `listAccounts`, `sign`, `sendBasicTransactionWithData`) with full error handling.
2. Wallet-native onboarding with real cryptographic session verification (no signup form, never touching private keys).
3. Direct CareDrop creation to any recipient wallet — no prior pairing/accept step. Loop auto-created on first exchange.
4. Three-plus polished CareDrop types: Photo (uploaded image), Playlist (Spotify/Apple Music/YouTube link), Movie Night (title/link/caption), Treat (caption-only, reuses the generic card).
5. Real photo storage (Vercel Blob), JPEG/PNG/WebP only, size-capped, no arbitrary HTML/SVG upload.
6. Real NIM transaction via `sendBasicTransactionWithData()`, integer-Luna accounting, minimal on-chain reference.
7. Server-side transaction verification (sender, recipient, amount, on-chain reference match, confirmation state) before marking delivered — never trust client-reported success.
8. Private, share-token-gated CareDrop links — content only served to the wallet-authenticated, pre-specified recipient.
9. Recipient reveal experience: media-first, gift already theirs, optional response.
10. Loop moments timeline: type, sender/recipient, amount, status; private content restricted to the two wallets involved.
11. "Send one back" reciprocity shortcut.
12. Polished error/empty/retry states for every documented failure mode — never a blank screen.

### P1 (after Critical Demo Path is demo-safe)

Reactions, richer playlist metadata (title/artwork via an officially permitted embed), opened/seen receipts, display names, scheduled "Open when…" CareDrops, better share cards, Mutual Loop, relationship streaks (no punishment mechanics).

### P2 (do not touch until everything else is finished)

Actual cinema ticket purchasing/provider integrations, voice/video, AI suggestions, groups, NFT memories, social feed, public discovery, advanced analytics, gamified tokens, marketplace, recommendation engine, smart contracts, escrow, staking, token incentives, USDT, EVM chains.

### Non-goals

No custom smart contract, no NFT, no token launch, no escrow, no gambling/chance mechanics, no pay-for-proof/challenge-completion gating on the gift itself, no social feed, no dating discovery, no buzzword AI, no multi-chain, no USDT, no separate native mobile app, no hosting/downloading/proxying of copyrighted music or movie content, no fabricated ticket bookings.

## Acceptance criteria (P0)

- **Wallet connect:** Opening NimCare inside Nimiq Pay triggers SDK `init()` and a real cryptographic login; outside Nimiq Pay, a genuine "Open in Nimiq Pay" conversion screen shows instead of a bare error.
- **Direct send, no accept gate:** A sender can create and send a CareDrop straight to any valid recipient wallet address, with no prior invite/accept step; the Loop between the two wallets is created automatically, verified by an automated test.
- **CareDrop send:** Given a type, its content, a recipient, and an amount, submitting triggers a real Nimiq Pay approval request; a user-cancelled approval leaves the CareDrop in a clearly labeled non-funded state with a retry path, never silently "sent."
- **Verification:** A CareDrop is marked delivered only after the backend independently retrieves and checks the transaction (sender, recipient, amount, on-chain reference) from real Nimiq blockchain data; a mismatch keeps it FAILED with a specific reason, never silently marked delivered.
- **Recipient access control:** Only the pre-specified recipient wallet, once authenticated, can read a CareDrop's content via its share link; any other wallet gets a clean rejection, not a content leak — verified by an automated test.
- **Reveal:** The recipient sees the media/content immediately upon opening a delivered CareDrop — there is no locked-note gate in this model; only the on-chain gift itself is gated on real verification.
- **Loop:** Both wallets see a chronological list of their exchanged moments; a third party cannot query this data.
- **Resilience:** Every documented failure scenario (cancel connect, cancel payment, invalid recipient address, self-send, unsupported CareDrop type, missing required media, RPC unavailable, transaction mismatch, unauthorized share-link access) renders a specific, non-blank, on-brand UI state or a passing automated test.

## Hackathon success definition

A judge understands the product in under 60 seconds, a Nimiq wallet is meaningfully required, a real NIM payment occurs, the payment creates real product state via genuine blockchain verification, two people interact through the product, the experience feels finished, it works inside Nimiq Pay, failure states don't break the experience, and the repo is public/MIT/documented.

## Product success definition

A pair of real users complete at least one full CareDrop exchange (send → verify → open → respond → Loop) without needing developer intervention, and without the recipient ever having to "accept" anything before seeing their surprise.

## Judge explanation (30 seconds)

"NimCare turns NIM into meaningful digital surprises. You send a CareDrop — a photo, a song, or a movie-night moment with a little NIM attached — straight to someone, no setup required on their end. They open the link, their wallet authenticates, and the surprise reveals immediately, with the gift already theirs. Nimiq Pay handles the real payment and Nimiq's own blockchain data proves it happened — the backend never just trusts the app's word for it. Every CareDrop two people exchange becomes part of their private Loop, so the relationship keeps building over time instead of being a one-off transaction."

## Product assumptions

See `PROJECT_PLAN.md` § Assumption Register (technical) — this PRD assumes those technical assumptions resolve favorably enough to preserve the flows above; if a spike fails, the flow's implementation detail (not its product intent) changes per the documented fallback.

## Open questions

- Exact final on-chain reference encoding (pending Spike S3).
- Exact signature verification message format (pending Spike S5).
- Whether physical device testing is available before submission (operational, not product, risk).
