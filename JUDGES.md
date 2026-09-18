# JUDGES — NimCare

A guide to what's real, where the evidence lives, and how NimCare maps to the current official scoring categories (re-verified live on 2026-09-18 via both `WebFetch` and a rendered browser load of https://miniappscompetition.com/scoring, since it's a client-rendered page a plain `curl` can't see): **Functionality/Reliability/Usefulness 45, Nimiq Pay & Nimiq Integration 25, Real Usage 15, Design & UX 10, Builder Promotion Checklist 5 — 100 points total.**

## Functionality, Reliability and Usefulness — 45

- **Core feature completes without error**: the full CareDrop loop (authenticate → compose a Photo CareDrop directly to a wallet, no pairing step → real NIM transaction → server-side verification bound to that exact CareDrop → share link → recipient opens and authenticates → media reveals → response → automatic Loop) was proven end-to-end against the live production deployment (`https://nimcare-api.vercel.app`) with a real Neon Postgres database, real Vercel Blob photo storage, and the real `@nimiq/core` cryptographic library — see `MEMORY.md` for the exact commands and results, including a 13-check adversarial re-audit run live on 2026-09-18.
- **Error handling**: every documented failure mode (provider unavailable, wallet permission denied, consensus not established, payment cancelled, invalid recipient address/self-send, unsupported CareDrop type, missing required media, malicious file upload, RPC unavailable, transaction mismatch, unauthorized share-link access, unauthenticated requests, malformed bodies) has a specific UI state and/or a passing automated/live test — see `DEVICE_TESTING.md` and `server/src/integration.test.ts` (23 passing tests, all run against the real production-grade Postgres database, not mocks).
- **Speed/stability**: static frontend on Vercel's edge, API on Vercel Functions with a pooled Neon connection; no long-running or blocking operations.
- **Completeness**: onboarding, pairing, CareDrop creation/payment/verification, response/reveal, and Memory are all implemented, not stubbed.
- **Real need / target audience**: partners, friends, and family living apart, who want a payment that carries intentional meaning instead of being a contextless transfer — see `PRD.md`.
- **Originality**: CareDrop is explicitly not a tip, bounty, or pay-for-proof mechanic — the gift belongs to the recipient the moment it's verified, before any response is required. See "Usefulness & Originality" below.
- **Repeat value**: the shared Memory timeline and the Loop pairing model are designed to be revisited, not opened once.

## Nimiq Pay and Nimiq Integration — 25

- **Real wallet identity**: `@nimiq/mini-app-sdk`'s `init()`/`listAccounts()` (verified against the SDK's actual shipped source, not assumed — see `MEMORY.md`).
- **Cryptographically verified wallet identity**: login requires a genuine Ed25519 signature (via `@nimiq/core`'s `PublicKey`/`Signature`) over a domain-bound challenge, verified server-side — not merely a client-claimed address. This replaced an earlier structural-only check identified and fixed during this hardening pass; see `server/src/services/nimiqSignedMessage.ts` and its tests.
- **Real NIM transfer**: `sendBasicTransactionWithData()`, integer-Luna accounting throughout (`app/src/lib/luna.ts`, `server/src/luna.ts`).
- **CareDrop-bound on-chain reference**: the transaction's `recipientData` is hex-decoded and checked against the CareDrop's own reference server-side — confirmed against a real, live mainnet transaction fetched from `rpc.nimiqwatch.com` during this hardening pass (see `MEMORY.md`), so one payment cannot be reused to fund two CareDrops (also DB-constrained and unit-tested).
- **Server-side reconciliation**: the backend never trusts a client-reported "success" — it independently queries Nimiq's own JSON-RPC (`getTransactionByHash`) and only advances state on a real match.
- **Graceful failure paths**: an unconfigured or unreachable RPC leaves a CareDrop honestly "verification pending," never fabricated as verified.
- **Two-person interaction**: the whole product is built around a paired Loop between two distinct wallets.

## Usefulness & Originality (folded into Functionality's "real need/originality" criteria above, and worth restating for clarity)

*(Updated 2026-09-18 for the surprise-first media pivot — see `MEMORY.md`.)* Payment apps move money without meaning. Messaging apps carry meaning without money. NimCare connects the two: a CareDrop is neither a tip (no expectation of service) nor a bounty (the gift is never conditional on completing anything — it's delivered and verified before any response happens). Unlike a plain payment-link product, NimCare's differentiation is that the payment is one component of a media-rich surprise (photo/song/movie/treat), and unlike the prior pair-first model, the recipient never accepts a relationship before receiving it — the Loop forms automatically from the exchange itself. A quick overlap audit against current Cycle II submissions (Nimiquette, Ralli, KashLink) found no substantive copying risk for this direction, recorded in `MEMORY.md`. Target users are people who already know each other and want their transfers to carry weight — not strangers, not a discovery mechanism. Repeat value comes from the growing Loop history and "Send one back," not a one-time transaction.

## Design & UX — 10

Warm off-white consumer-product visual direction (Manrope typography, coral primary action with sky/green/gold accents used narrowly, original illustrated envelope mascot and supporting characters instead of emoji — see `DESIGN.md`), a light theme forced regardless of system dark-mode preference, mobile-first (verified with no horizontal overflow at 320–430px via the browser tool, live in production, including with the browser emulator forced to dark mode to confirm the theme holds), a single clear primary action ("Send a CareDrop," no competing secondary CTA), and a deliberate photo-first reveal moment (fade-up animation, respects `prefers-reduced-motion`). The product leads with "Send a moment, not just money," not blockchain terminology — a judge should understand the pitch in under 60 seconds (see the one-sentence pitch in `SUBMISSION.md`).

## Real Usage — 15

This category is inherently about post-launch behavior, which this build cannot fabricate or predict. What's true right now: the invite/Loop mechanism is built to make acquisition organic (every pair requires a second real wallet to accept), and the app is live at `https://nimcare-app.vercel.app` should real users be directed to it. No usage numbers are claimed here because none exist yet — see `SUBMISSION.md` for what's marked `TODO` rather than fabricated.

## Builder Promotion Checklist — 5

See `SUBMISSION.md` for the checklist status — public GitHub repo (done), MIT license (done), written description (done); social/Skool posts and demo video are marked `TODO` because they haven't happened yet, not because they're being hidden.

## Judge explanation (30 seconds)

"NimCare turns NIM into meaningful digital surprises. You send a CareDrop — a photo, a song, or a movie-night moment with a little NIM attached — straight to someone, no setup required on their end. They open the link, their wallet authenticates, and the surprise reveals immediately, with the gift already theirs. Nimiq Pay handles the real payment and Nimiq's own blockchain data proves it happened — the backend never just trusts the app's word for it. Every CareDrop two people exchange becomes part of their private Loop, so the relationship keeps building over time instead of being a one-off transaction."

## What to independently verify

- Live production health check: `curl https://nimcare-api.vercel.app/api/health`
- Automated evidence: `cd server && npm test` (23 tests, real Postgres, real `@nimiq/core` cryptography)
- On-device proof: see `DEVICE_TESTING.md` — marked `UNTESTED` for anything genuinely not yet run on a physical device with Nimiq Pay, by design, so this document never overclaims.
