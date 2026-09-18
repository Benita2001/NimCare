# NimCare

**Send a moment, not just money.**
Turn a little NIM into something they'll remember.

NimCare is a [Nimiq Pay](https://nimiq.dev/mini-apps/) Mini App built for the [Nimiq Mini Apps Competition, Cycle II](https://miniappscompetition.com/). It turns NIM into meaningful digital surprises — a **CareDrop** is a photo, a song, a movie-night gift, or a small treat, with a little NIM attached, sent directly to someone.

## The problem

Payment apps move money without meaning. Messaging apps carry meaning without money. NimCare connects the two — and unlike most "send NIM" products, the recipient never has to accept a relationship or complete any setup before receiving their surprise.

## How it works

1. **Connect** — open NimCare inside Nimiq Pay and connect your wallet. No email, no password.
2. **Pick a moment** — Photo ("I was thinking of you"), Playlist ("This made me think of you"), Movie Night, or a small Treat.
3. **Send it** — add the content, pick who it's for (an existing Loop, or any wallet address), pick an amount, and approve the real NIM transaction through Nimiq Pay's native approval UI.
4. **Verified, not assumed** — NimCare's backend independently checks the transaction against real Nimiq blockchain data, and that it's bound to this exact CareDrop, before marking it delivered.
5. **The surprise** — your recipient opens your link, authenticates their wallet, and the moment reveals immediately — the gift is already theirs. They can respond, and send one back.
6. **The Loop** — every CareDrop two wallets exchange automatically becomes part of their shared history. No separate "accept" step ever happens.

*(2026-09-18: pivoted from an earlier pair-first, text-prompt-only model — see `MEMORY.md` for the full rationale and a git tag, `pre-media-caredrop-pivot`, if you want to see what came before.)*

## Why Nimiq

Nimiq Pay gives NimCare wallet-native identity, native transaction approval, real NIM transfers, and a verifiable on-chain record — without Nimiq, NimCare has no trust layer and no payment. This isn't a bolt-on integration; it's the mechanism the whole product is built around.

## What's real vs. what's disclosed as unverified

This repository is transparent about what has and hasn't been proven, and updates this section rather than leaving stale claims in place:

- ✅ **Real, working, live in production**: wallet connect + its full error handling, real cryptographic wallet authentication (`@nimiq/core` signature verification — see `server/src/services/nimiqSignedMessage.ts`), direct-to-wallet CareDrop creation with **no pairing/invite/accept step** (the Loop forms automatically on first exchange), real photo upload to Vercel Blob, real `sendBasicTransactionWithData` payments, server-side transaction verification against a real public Nimiq RPC endpoint (`https://rpc.nimiqwatch.com`, confirmed reachable and returning real mainnet data) that's bound to the exact CareDrop (on-chain reference + unique-hash enforcement — one payment can't fund two CareDrops), share-token access control (only the pre-specified recipient wallet, once authenticated, can read a CareDrop's content), and the Loop moments timeline. All proven end-to-end against the live production deployment via 23 automated tests plus a 13-check live adversarial smoke test — see `MEMORY.md` for exact commands and results. A Cashlink-based funding path (so senders wouldn't need to know the recipient's address up front) was investigated and concluded not viable in the current Mini App SDK — see `MEMORY.md`; `sendBasicTransactionWithData` is the only funding rail actually used.
- ⚠️ **Not yet tested on a physical device**: nothing here has been run inside the real Nimiq Pay app on a phone. See `DEVICE_TESTING.md` for the exact protocol and its current `UNTESTED` rows (note: that document still describes the pre-pivot flow in its step list and needs a rewrite pass — flagged there, not hidden).
- ⚠️ **Testnet vs. mainnet for the live demo**: the configured RPC endpoint was verified against mainnet data during hardening; whether it also serves testnet is unconfirmed — see `DEVICE_TESTING.md`'s prerequisites before funding a demo wallet.

See `PROJECT_PLAN.md`, `TRD.md`, and `MEMORY.md` for full detail and evidence sourcing.

## Architecture

- `app/` — Vite + React + TypeScript Mini App using `@nimiq/mini-app-sdk`. Deployed as a static site on Vercel.
- `server/` — Express + TypeScript API (deployed as a Vercel Function via `server/api/index.ts`), Postgres (Neon, provisioned via the Vercel Marketplace) persistence, Nimiq JSON-RPC verification service.

See `TRD.md` for the full technical design, data model, and API contracts.

## Live deployment

- Frontend: https://nimcare-app.vercel.app
- API: https://nimcare-api.vercel.app (health check: `/api/health`)

## Installation & development

Requires Node.js 22+ (built and tested on Node 24).

```bash
# Backend
cd server
npm install
vercel env pull .env.local   # pulls the real Neon DATABASE_URL (requires `vercel link` once)
# or: cp .env.example .env and fill in DATABASE_URL yourself
npm run dev             # http://localhost:8787

# Frontend (separate terminal)
cd app
npm install
cp .env.example .env
npm run dev             # http://localhost:5173
```

## Testing inside Nimiq Pay

1. `cd app && npm run dev -- --host` and note the LAN URL (e.g. `http://192.168.1.42:5173`).
2. Ensure your phone and dev machine are on the same Wi-Fi.
3. In Nimiq Pay, open Mini Apps → Custom URL, and enter the LAN URL.
4. For test funds: long-press the settings button for 10 seconds to reveal the hidden dev menu, switch to Testnet, and use "Get free NIM."

Local dev serves over plain HTTP, which is not a secure browsing context — see `MEMORY.md` for the one API compatibility note this causes (`crypto.randomUUID()` availability).

## Environment variables

See `server/.env.example` and `app/.env.example`. No secrets are committed to this repository.

## Deployment

Live on Vercel: frontend (static Vite build) and backend (Express app served as a Vercel Function, `server/api/index.ts` + `server/vercel.json`) are separate Vercel projects, connected to this GitHub repo for CI. The database is a real Postgres instance (Neon) provisioned through the Vercel Marketplace — not SQLite, which is unsuitable for serverless (ephemeral filesystem). `NIMIQ_RPC_URL`, `APP_ORIGIN`, and `ALLOWED_ORIGINS` are set as real production environment variables (see `server/.env.example` for what each does — no secrets are in this repo).

## Privacy & security

See `PRIVACY.md`. No private keys or seed phrases are ever collected. Private notes and responses are never written on-chain.

## Hackathon context

Built for the Nimiq Mini Apps Competition, Cycle II ($17,000 prize pool). See `SUBMISSION.md` for the submission package, `JUDGES.md` for how NimCare maps to the current scoring rubric with evidence, `DEVICE_TESTING.md` for the on-device test protocol, and `PROJECT_PLAN.md` for the full planning trail.

## License

MIT — see `LICENSE`.
