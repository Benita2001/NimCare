# SUBMISSION — NimCare

## Written description (≤250 words)

NimCare is a Nimiq Pay Mini App that turns NIM into meaningful digital surprises. A CareDrop is a photo, a song/playlist link, a movie-night gift, or a small treat — with a little NIM attached — sent directly to someone's wallet. Unlike most "send NIM" products, the recipient never accepts a relationship or completes setup first: they open a private link, their wallet authenticates via `@nimiq/mini-app-sdk` with genuine Ed25519 signature verification, and the surprise reveals immediately. Nimiq Pay handles the real payment through its native approval UI, and NimCare's backend never takes the client's word for it — it independently verifies every transaction against real Nimiq blockchain data, including that the payment is bound to this exact CareDrop, before the surprise is marked delivered. The gift already belongs to the recipient the moment it's verified; responding is a genuine reaction, not a condition for receiving it. The first CareDrop two wallets exchange automatically forms a private Loop, and every CareDrop after adds to their shared history — "Send one back" keeps it going. Target users are couples, friends, and family living apart who want a more intentional way to stay connected — not a tipping jar, not a bounty app, not a dating product. Built with Vite + React + TypeScript, an Express + Postgres backend (Neon via Vercel Marketplace), and Vercel Blob for photo storage, NimCare stays deliberately small: one real loop — connect, send, verify, open, respond, remember — over a wide surface of half-built features.

## One-sentence pitch

NimCare turns NIM into meaningful digital surprises. Send a CareDrop — a photo, playlist, or movie-night moment with a little NIM attached — and every CareDrop you exchange becomes part of your private Loop with that person.

## Nimiq integration explanation

Wallet-native onboarding via `listAccounts()` with real Ed25519 signature verification (`@nimiq/core`) for session login, real payments via `sendBasicTransactionWithData()` carrying a CareDrop-bound on-chain reference, and server-side verification against the real Nimiq JSON-RPC (`https://rpc.nimiqwatch.com`) before any CareDrop is considered delivered. No email/password, no custody of keys. (A Cashlink-based funding path was investigated so senders wouldn't need a recipient address up front, but concluded not viable in the current Mini App SDK — see `MEMORY.md`.)

## Setup / test instructions

See `README.md` § Installation & development and § Testing inside Nimiq Pay.

## Repository link

https://github.com/Benita2001/NimCare

## Live app link

https://nimcare-app.vercel.app (backed by a live Vercel Function API at https://nimcare-api.vercel.app with a real Neon Postgres database — see `README.md` § Deployment). Not yet tested inside the real Nimiq Pay app on a physical device — see `DEVICE_TESTING.md`.

## Demo video link

TODO — requires a human with a real Nimiq Pay device and two funded wallets to record; see `TASKS.md` NIM-026.

## Public social post

TODO — not yet posted.

## Skool community post

TODO — not yet posted.

## Final submission checklist

- [x] Public GitHub repository
- [x] MIT `LICENSE`
- [x] No secrets committed (`.env.example` only, real `.env`/`.env.local` gitignored; `server/data/*.db` purged from tracking during the 2026-09-18 hardening pass)
- [x] `PRIVACY.md` disclosure
- [x] Core CareDrop loop implemented and proven end to end against the live production deployment (see `MEMORY.md`)
- [x] Production deployment — live on Vercel with a real Neon Postgres database
- [x] Real cryptographic wallet authentication (not just structural checks)
- [x] Automated tests: 20 passing (auth forgery/expiry/replay, transaction verification, authorization, invite consumption) — `cd server && npm test`
- [x] Lint/typecheck/build clean on both packages
- [ ] Real on-device Nimiq Pay test with two funded wallets — human action required, protocol ready in `DEVICE_TESTING.md`
- [ ] Demo video recorded
- [ ] Social/Skool posts published
- [ ] Final rule re-check against https://miniappscompetition.com/rules and https://miniappscompetition.com/scoring immediately before submitting — this build re-verified the scoring page live on 2026-09-18 (45/25/15/10/5/100, see `MEMORY.md`), but re-check again since it can change
