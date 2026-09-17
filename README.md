# NimCare

**Send more than money.**
Turn a small NIM gift into a moment that matters.

NimCare is a [Nimiq Pay](https://nimiq.dev/mini-apps/) Mini App built for the [Nimiq Mini Apps Competition, Cycle II](https://miniappscompetition.com/). It turns a small NIM payment into a shared, meaningful moment between two people who already know each other — a partner, a friend, a family member.

## The problem

Payment apps move money without meaning. Messaging apps carry meaning without money. NimCare connects the two: a payment becomes a small, intentional gesture with a prompt and a private note attached.

## How it works

1. **Connect** — open NimCare inside Nimiq Pay and connect your wallet. No email, no password.
2. **Create your Loop** — invite someone (Partner / Friend / Family) with a shareable link.
3. **Send a CareDrop** — pick a prompt ("Coffee on me ☕"), an amount, and write a private note. NimCare requests a real NIM transaction through Nimiq Pay's native approval UI.
4. **Verified, not assumed** — NimCare's backend independently checks the transaction against real Nimiq blockchain data before marking it delivered. It never trusts the client's word alone.
5. **Respond & reveal** — your recipient sees the gift (already theirs) and a locked note. They respond, the note unlocks, and the moment joins your shared **Memory** timeline.

## Why Nimiq

Nimiq Pay gives NimCare wallet-native identity, native transaction approval, real NIM transfers, and a verifiable on-chain record — without Nimiq, NimCare has no trust layer and no payment. This isn't a bolt-on integration; it's the mechanism the whole product is built around.

## What's real vs. what's disclosed as unverified

This repository is transparent about what has and hasn't been proven in this build environment (no physical Nimiq Pay device or funded wallet was available while building):

- ✅ **Real, working**: wallet connect flow and its full error handling (verified live — see `MEMORY.md`), pairing/invite flow, CareDrop creation, the `sendBasicTransactionWithData` call wired to the verified SDK contract, server-side transaction verification logic against the documented Nimiq JSON-RPC schema, the full CareDrop state machine, sealed-note authorization, and the Memory timeline — all proven end-to-end against a real local database (see the Phase 0 smoke test recorded in `MEMORY.md`).
- ⚠️ **Structural, not cryptographic (yet)**: wallet-session signature verification checks nonce validity and structure but does not yet perform full cryptographic verification of the Nimiq `sign()` output — see `TRD.md` Spike S5 and `server/src/routes/auth.ts`.
- ⚠️ **Requires configuration**: server-side transaction verification needs a real `NIMIQ_RPC_URL` (a Nimiq node's own RPC endpoint — no public default is documented). Without it, CareDrops honestly report "verification pending," never a fabricated "verified."
- ⚠️ **Requires a human with a device**: on-device testing inside the real Nimiq Pay app, with two funded wallets, has not been performed in this environment. Nimiq Pay's testnet has a free-NIM faucet (see `MEMORY.md`) that makes this cheap to do.

See `PROJECT_PLAN.md`, `TRD.md`, and `MEMORY.md` for full detail and evidence sourcing.

## Architecture

- `app/` — Vite + React + TypeScript Mini App using `@nimiq/mini-app-sdk`.
- `server/` — Express + TypeScript API, SQLite (dev) persistence, Nimiq JSON-RPC verification service.

See `TRD.md` for the full technical design, data model, and API contracts.

## Installation & development

Requires Node.js 22+ (built and tested on Node 24).

```bash
# Backend
cd server
npm install
cp .env.example .env   # fill in NIMIQ_RPC_URL if you have one
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

Not yet deployed. Production needs a real managed database (SQLite is dev-only and unsuitable for serverless/production hosting) and a configured `NIMIQ_RPC_URL` — both require credentials/infrastructure not available while building this submission. See `PROJECT_PLAN.md` § Major Blockers.

## Privacy & security

See `PRIVACY.md`. No private keys or seed phrases are ever collected. Private notes and responses are never written on-chain.

## Hackathon context

Built for the Nimiq Mini Apps Competition, Cycle II ($17,000 prize pool). See `SUBMISSION.md` for the submission package and `PROJECT_PLAN.md` for the full planning trail.

## License

MIT — see `LICENSE`.
