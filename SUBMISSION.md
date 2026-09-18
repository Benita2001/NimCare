# SUBMISSION — NimCare

## Written description (≤250 words)

NimCare is a Nimiq Pay Mini App that turns small NIM payments into meaningful shared moments between people who already know each other — partners, friends, family. Instead of sending someone a contextless crypto transfer, you send a CareDrop: a small NIM gift paired with a personal prompt ("Coffee on me ☕") and a private, sealed note. Nimiq Pay handles everything that makes this trustworthy: wallet-native identity via `@nimiq/mini-app-sdk`, native transaction approval, and a real NIM transfer. NimCare's backend never takes the client's word for it — it independently verifies every transaction against real Nimiq blockchain data before marking a CareDrop delivered. The recipient already owns the gift the moment it's verified; responding and completing the interaction is what unlocks the sender's private note, turning the exchange into a small emotional payoff rather than a task-for-money transaction. Completed CareDrops build a private, shared Memory timeline for the pair. Target users are long-distance couples, close friends, and family members who want a more intentional way to stay connected — not a dating app, not a tipping jar, not a challenge-for-money product. Built with Vite + React + TypeScript and a small Express + SQLite backend, NimCare keeps its architecture deliberately small: one real, reliable, end-to-end loop — connect, pair, send, verify, respond, reveal, remember — rather than a wide surface of half-built features.

## One-sentence pitch

NimCare turns NIM payments into meaningful shared moments through CareDrops, private prompts, wallet-verified interactions, and shared memories.

## Nimiq integration explanation

Wallet-native onboarding via `listAccounts()` with real Ed25519 signature verification (`@nimiq/core`) for session login, real payments via `sendBasicTransactionWithData()` carrying a CareDrop-bound on-chain reference, and server-side verification against the real Nimiq JSON-RPC (`https://rpc.nimiqwatch.com`) before any CareDrop is considered funded. No email/password, no custody of keys.

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
