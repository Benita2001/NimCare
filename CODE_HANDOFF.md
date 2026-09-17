# CODE_HANDOFF — NimCare

Planning Gate: **PASS** (2026-09-16). Full detail lives in `PROJECT_PLAN.md`, `PRD.md`, `TRD.md`, `TASKS.md`, `MEMORY.md` — this file is a compact entry point, not a duplicate.

## Selected product

NimCare — a Nimiq Pay Mini App turning small NIM payments into meaningful shared moments (CareDrop → Loop → Memory). See `PRD.md`.

## P0 (must ship)

Wallet-native onboarding, secure session, pairing/invite, CareDrop creation, real NIM transaction, server-side verification, recipient experience, response/completion, sealed-note reveal, memory timeline, full error-state coverage. Full list: `PRD.md` § Scope.

## Critical Demo Path

Connect wallet → pair → send real NIM CareDrop → server verifies on-chain → recipient responds/completes → note reveals → both see Memory. Full detail: `PROJECT_PLAN.md` § 3.

## Sponsor integration

`@nimiq/mini-app-sdk`: `init`, `listAccounts`, `sign`, `sendBasicTransactionWithData`. Verified method signatures in `MEMORY.md`. No EVM/USDT usage (NIM only, per non-goals).

## Technical direction

Vite + React + TS mini app (`app/`) + Express + TS API (`server/`) + SQLite (dev; Postgres deferred, needs credentials). Full architecture: `TRD.md`.

## Validation spikes (Phase 0)

S1 provider init, S2 real payment, S3 payment-with-data, S4 transaction verification, S5 signature verification, S6 deeplink, S7 persistence. Status and fallbacks: `PROJECT_PLAN.md` § 9. **S1/S2/S5/S6 need a human with a real Nimiq Pay device** — testnet funding is free and documented (`MEMORY.md`), so this is a device-access blocker, not a funding blocker.

## Resource budget

No time-boxed sub-budgets beyond "protect the Critical Demo Path first, cut P1/P2 before it." Resource risk: no confirmed cloud DB credentials, no confirmed physical device in this environment. See `PROJECT_PLAN.md` § 11 and § 15 (Major Blockers).

## Demo fixture

Two real wallets, one Partner/Friend pair, "Coffee on me ☕" template, 0.1 NIM (configurable). Full spec: `PROJECT_PLAN.md` § 12.

## Winning Requirements Matrix status

See `PROJECT_PLAN.md` § 6 — all rows currently UNKNOWN/PLANNED pending implementation; update statuses as each is proven.

## Assumption register status

See `PROJECT_PLAN.md` § 7 — all technical assumptions UNKNOWN pending Phase 0 spikes; two (S4 RPC endpoint, S5 signature format) carry the highest build risk and should be revisited the moment implementation touches them.

## Do NOT do

No smart contracts, NFTs, escrow, staking, token incentives, USDT, EVM, native mobile app, AI features, gambling/chance mechanics, social feed, dating functionality, or payment-for-proof mechanics (the NIM is always a gift, never compensation). No fabricated transactions, verification results, users, or persistence. No secrets committed.

## Current risks

No confirmed physical Nimiq Pay device/funded wallet in this coding environment (blocks on-device proof of S1/S2/S5/S6 — build proceeds against documented contracts regardless). No confirmed public Nimiq RPC endpoint for server-side verification (S4) — verification service must degrade gracefully rather than fake success.

## First build objective

Phase 0: scaffold `app/` and `server/`, wire the documented SDK calls and DB schema, prove persistence (NIM-002 through NIM-004 in `TASKS.md`).

Continue directly into implementation — do not stop to re-confirm this handoff.
