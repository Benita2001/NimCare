# CODE_HANDOFF — NimCare

> **Refreshed 2026-09-18** (release audit pass). This file was stale from the original 2026-09-16 planning session through several rounds of pivot and redesign — it now reflects current reality. Full detail lives in `PROJECT_PLAN.md`, `PRD.md`, `TRD.md`, `TASKS.md`, `MEMORY.md` — this file is a compact entry point, not a duplicate.

## Selected product (post-pivot)

NimCare — a Nimiq Pay Mini App turning NIM into meaningful digital surprises: a **CareDrop** (photo/playlist/movie/treat) with a little NIM attached, sent directly to a wallet, no pairing step required. The **Loop** between two wallets forms automatically the first time they exchange one. See `PRD.md`. (The original pair-first/text-prompt-only model is superseded — see git tag `pre-media-caredrop-pivot` for that snapshot.)

## P0 (shipped and live)

Wallet-native onboarding with **real cryptographic session auth** (`@nimiq/core` signature verification, not structural-only), direct-to-wallet CareDrop creation (no invite/accept gate), real photo upload (Vercel Blob), real NIM transaction (`sendBasicTransactionWithData`), server-side transaction verification bound to the exact CareDrop, share-token-gated recipient access, response + "Send one back," and the Loop moments timeline. Full list: `PRD.md` § Scope.

## Critical Demo Path (current)

Connect wallet → compose a Photo CareDrop → pick recipient (existing Loop or new address) → real NIM transaction → server verifies on-chain and binds it to this CareDrop → share link → recipient opens, authenticates, sees "A CareDrop found you" → media reveals → responds → Loop shows the moment automatically. Full detail: `PROJECT_PLAN.md` § 3.

## Sponsor integration

`@nimiq/mini-app-sdk`: `init`, `listAccounts`, `sign`, `sendBasicTransactionWithData` (verified against the SDK's actual shipped source — see `MEMORY.md`). `@nimiq/core` used server-side for real Ed25519 signature verification. Cashlink (`@nimiq/hub-api`) was investigated so senders wouldn't need to know a recipient address up front — **concluded not viable** in the current Mini App SDK (no Cashlink methods on the provider; Hub API's Cashlink support is a redirect-based flow incompatible with a Mini App WebView). `sendBasicTransactionWithData` is the only funding rail actually shipped.

## Technical direction (current)

Vite + React + TS mini app (`app/`, deployed as a static site on Vercel) + Express + TS API (`server/`, deployed as a Vercel Function) + **real Postgres** (Neon, provisioned via the Vercel Marketplace — SQLite was fully migrated away from, not deferred) + **real Vercel Blob** for photo storage. Full architecture: `TRD.md`.

## Live production

- Frontend: https://nimcare-app.vercel.app
- API: https://nimcare-api.vercel.app (health: `/api/health`)
- Both independently re-verified live during the 2026-09-18 release audit (13-check adversarial smoke test, real crypto, real photo upload, real Postgres, real RPC lookups) — see `MEMORY.md`.

## Validation spikes — final status

S1 (provider init), S2 (real payment), S3 (payment-with-data), S4 (transaction verification), S5 (signature verification), S7 (persistence) are all **VERIFIED** via live production evidence and/or real `@nimiq/core` cryptographic round-trips — see `MEMORY.md`. S6 (Cashlink/deeplink) resolved as **FAIL/NOT VIABLE** with architectural evidence, not a live device test. The one thing still genuinely `UNTESTED` is the full flow inside a real physical Nimiq Pay app — no device has been available in this coding environment at any point.

## Do NOT do

No smart contracts, NFTs, escrow, staking, token incentives, USDT, EVM, native mobile app, AI features, gambling/chance mechanics, social feed, dating functionality, or payment-for-proof mechanics (the NIM is always a gift, never compensation). No fabricated transactions, verification results, users, or persistence. No secrets committed. No Cashlink claims beyond "investigated, not viable." No re-introducing a pairing/accept gate into the primary UX.

## Current risks / blockers

No confirmed physical Nimiq Pay device in this coding environment — blocks the final on-device UI walkthrough (`DEVICE_TESTING.md`, still describes the pre-pivot flow and needs a rewrite pass to match current UX, flagged there explicitly). Everything server-side that flow would exercise is proven by 23 automated tests plus live production smoke tests instead.

## If you are a fresh agent picking this up

1. Read `MEMORY.md` bottom-to-top-ish (most recent entries are appended, each dated) for the actual evidence trail — don't trust any prior session's narrative summary without checking the underlying command output it cites.
2. Run `cd server && npm test` and `cd app && npm run build` to confirm current state before touching anything.
3. Check `TASKS.md` for the current open item list (NIM-04x/05x range covers the pivot/redesign/audit work).
4. The Critical Demo Path is real and proven server-side; the only remaining hard blocker is physical-device testing.
