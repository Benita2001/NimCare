# SUBMISSION — NimCare

## Written description (≤250 words)

NimCare is a Nimiq Pay Mini App that turns small NIM payments into meaningful shared moments between people who already know each other — partners, friends, family. Instead of sending someone a contextless crypto transfer, you send a CareDrop: a small NIM gift paired with a personal prompt ("Coffee on me ☕") and a private, sealed note. Nimiq Pay handles everything that makes this trustworthy: wallet-native identity via `@nimiq/mini-app-sdk`, native transaction approval, and a real NIM transfer. NimCare's backend never takes the client's word for it — it independently verifies every transaction against real Nimiq blockchain data before marking a CareDrop delivered. The recipient already owns the gift the moment it's verified; responding and completing the interaction is what unlocks the sender's private note, turning the exchange into a small emotional payoff rather than a task-for-money transaction. Completed CareDrops build a private, shared Memory timeline for the pair. Target users are long-distance couples, close friends, and family members who want a more intentional way to stay connected — not a dating app, not a tipping jar, not a challenge-for-money product. Built with Vite + React + TypeScript and a small Express + SQLite backend, NimCare keeps its architecture deliberately small: one real, reliable, end-to-end loop — connect, pair, send, verify, respond, reveal, remember — rather than a wide surface of half-built features.

## One-sentence pitch

NimCare turns NIM payments into meaningful shared moments through CareDrops, private prompts, wallet-verified interactions, and shared memories.

## Nimiq integration explanation

Wallet-native onboarding via `listAccounts()`, real payments via `sendBasicTransactionWithData()` carrying a minimal on-chain reference, and server-side verification against the Nimiq JSON-RPC transaction schema before any CareDrop is considered funded. No email/password, no custody of keys.

## Setup / test instructions

See `README.md` § Installation & development and § Testing inside Nimiq Pay.

## Repository link

https://github.com/Benita2001/NimCare

## Live app link

TODO — not yet deployed; see `PROJECT_PLAN.md` § Major Blockers (needs a managed database and a configured Nimiq RPC endpoint, neither of which had credentials available while building this submission).

## Demo video link

TODO — requires a human with a real Nimiq Pay device and two funded wallets to record; see `TASKS.md` NIM-026.

## Public social post

TODO — not yet posted.

## Skool community post

TODO — not yet posted.

## Final submission checklist

- [x] Public GitHub repository
- [x] MIT `LICENSE`
- [x] No secrets committed (`.env.example` only, real `.env` gitignored)
- [x] `PRIVACY.md` disclosure
- [x] Core CareDrop loop implemented and smoke-tested end to end (see `MEMORY.md`)
- [ ] Real on-device Nimiq Pay test with two funded wallets — human action required
- [ ] Production deployment — blocked on database/RPC credentials
- [ ] Demo video recorded
- [ ] Social/Skool posts published
- [ ] Final rule re-check against https://miniappscompetition.com/rules before submitting
