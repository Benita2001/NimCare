# PROJECT PLAN

## 1. Project

**Name:** NimCare
**Hackathon:** Nimiq Mini Apps Competition — Cycle II
**Track:** Nimiq Pay Mini App
**Deadline:** 2026-09-18 23:59 UTC (submission deadline; re-verify against organizer page before final submission — judging may occur after this date)
**Timezone:** UTC
**Planning mode:** Sprint

## 2. Objective

### One sentence

NimCare is a Nimiq Pay Mini App that turns small NIM payments into meaningful shared experiences between people through CareDrops, private prompts, wallet-verified interactions and shared memories.

### Build objective

Ship a working, judge-testable vertical slice of the Critical Demo Path: wallet connect → pair → send a real NIM CareDrop → server-verify the transaction → recipient responds/completes → sealed note reveals → shows in shared Memory.

### Winning objective

A small, reliable, well-designed Mini App beats a large unfinished one (scoring: 45 functionality/reliability, 25 Nimiq integration, 15 real usage, 10 design/UX, 5 builder promotion). Protect the Critical Demo Path above feature count.

## 3. Critical Demo Path

1. Wallet A opens NimCare inside Nimiq Pay, connects via `@nimiq/mini-app-sdk`.
2. Wallet A creates a Loop (pair invite), Wallet B accepts with their own wallet.
3. Wallet A sends a CareDrop (template + amount + private note) — real NIM transaction via Nimiq Pay's native approval UI.
4. Backend verifies the transaction against real Nimiq blockchain data (not client-trusted).
5. Wallet B sees the CareDrop, responds, completes it (wallet signature if validated).
6. Sealed note reveals; both see it in shared Memory.

**Memorable moment:** A real Nimiq payment becomes a meaningful shared relationship experience — judges see money move on-chain and an emotional interaction unlock as a direct result.
**Sponsor proof:** Real `@nimiq/mini-app-sdk` account access, real signed NIM transaction, server-side verification against live Nimiq transaction data.

## 4. Build Strategy

### P0 principle

Nothing matters if wallet connect → real payment → verified state → recipient completion doesn't work end-to-end. Build that first, thinly, before any visual polish.

### Risk principle

The Nimiq Mini App SDK, transaction-with-data behavior, transaction verification schema, and signature verification semantics are all unverified against current docs/SDK. These are Phase 0 spikes, not assumptions.

### Scope principle

No smart contracts, no escrow, no AI, no multi-chain, no social feed, no mobile native app. Every new feature must justify itself against the Critical Demo Path or be deferred (see `TASKS.md` scope-change rule).

## 5. Execution Phases

### Phase 0: Environment and Risk Validation

**Goal:** Prove Nimiq Mini App SDK, real payment, transaction verification, and signature verification actually work as documented.
**Why now:** These are the highest-risk, highest-blast-radius unknowns; everything else depends on them.
**Major dependencies:** Nimiq Developer Center docs, `@nimiq/mini-app-sdk` package, a Nimiq Pay-capable device/wallet with test NIM.
**Milestone:** Spikes 1–5 resolved to VERIFIED/UNKNOWN with evidence recorded in `MEMORY.md`.
**Gate:** Real wallet address obtained; real tiny transaction sent and retrieved via blockchain API — OR concrete blocker documented (e.g., no physical device/Nimiq Pay access in this environment).

### Phase 1: Core Infrastructure

**Goal:** App shell (Vite + React + TS), backend/API skeleton, persistence, env handling, Nimiq provider adapter.
**Major dependencies:** Phase 0 SDK findings.
**Milestone:** App boots, backend has a working DB-backed API, provider adapter compiles against real SDK types.
**Gate:** A record created via API survives a restart and is readable by a second client.

### Phase 2: Core Engine

**Goal:** Wallet-native onboarding, secure session (nonce+signature if verified), pairing/invite flow.
**Major dependencies:** Phase 0 signature spike result.
**Milestone:** Two wallets can pair through an invite link/code.
**Gate:** Pair record persists with both wallet addresses and status ACCEPTED.

### Phase 3: End to End Core Loop

**Goal:** CareDrop creation → real NIM transaction → server verification → delivery → response → completion → reveal → Memory.
**Major dependencies:** Phases 0–2.
**Milestone:** Critical Demo Path completes once, end to end, with a real (or best-available-in-environment) transaction.
**Gate:** CareDrop reaches COMPLETED state with verified transaction data and revealed note.

### Phase 4: Product Completion

**Goal:** All P0 error states, prompt library, empty states, settings/privacy screen.
**Milestone:** No blank/broken screens across the flow.
**Gate:** Manual run-through of P0.12 error states.

### Phase 5: Frontend Refinement

**Goal:** Apply `DESIGN.md` — warm/premium visual direction, mobile-first, motion, reveal moment polish.
**Milestone:** Screens match design direction; passes a mobile-viewport pass in the browser tool.
**Gate:** No horizontal overflow, comfortable touch targets, accessible contrast.

### Phase 6: QA and Resilience

**Goal:** Lint/typecheck/test/build gates green; security/privacy review; realistic failure-mode testing.
**Milestone:** Quality gates section in this file all PASS or explicitly UNKNOWN/BLOCKED with reason.
**Gate:** Demo-safe.

### Phase 7: Demo and Submission Hardening

**Goal:** README, SUBMISSION.md, PRIVACY.md, LICENSE, demo fixture script, deployment.
**Milestone:** Public repo ready, deployment reachable over HTTPS (if credentials/environment allow).
**Gate:** Submission checklist complete or blockers explicit.

## 6. Winning Requirements Matrix

| Requirement / Rubric | Source | Importance | Product behavior | Implementation | Verification | Demo / Submission proof | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Built as Nimiq Pay Mini App | Organizer rules | Required | App loads inside Nimiq Pay | `@nimiq/mini-app-sdk` `init()` | Manual device test | Screen recording | UNKNOWN |
| Real NIM support | Scoring: Nimiq integration (25) | High | CareDrop payments are real NIM transfers | `sendBasicTransactionWithData()` | Live prod smoke test | `MEMORY.md` (RPC evidence) | VERIFIED (SDK contract + live RPC lookup); on-device tx send still UNTESTED |
| Wallet integration | Scoring: Nimiq integration | High | Wallet-native onboarding, real cryptographic session auth | `listAccounts()` + `@nimiq/core` signature verify | 5 unit + 4 integration tests | `server/src/services/nimiqSignedMessage.test.ts` | VERIFIED (real keypair round-trip); on-device UNTESTED |
| Transaction verification | P0.7 | High | Server never trusts client-only success; binds tx to exact CareDrop | Real RPC lookup + recipientData match + unique-hash | 6 integration tests + live prod smoke test | `server/src/integration.test.ts`, `MEMORY.md` | VERIFIED |
| Functionality/reliability (45 pts) | Scoring | Critical | Critical Demo Path completes without crash | All P0 + hardening fixes | 20 automated tests, live prod smoke test | `MEMORY.md` | VERIFIED (server-side); on-device UI walkthrough UNTESTED — see `DEVICE_TESTING.md` |
| Real usage (15 pts) | Scoring | Medium | Organic pairing/sharing drives new wallets | Invite links (+ Nimiq Pay deeplink) | N/A (behavioral) | Post-launch, not controllable pre-submission | N/A |
| Design & UX (10 pts) | Scoring | Medium | Warm, premium, non-crypto-dashboard feel | `DESIGN.md` + Phase 5 | Visual QA pass (browser tool, mobile viewport) | Live at nimcare-app.vercel.app | VERIFIED (rendered) |
| Builder promotion (5 pts) | Scoring | Low | Public social/Skool post | N/A | N/A | Links in `SUBMISSION.md` | TODO (human action) |
| Public GitHub, MIT license | Organizer rules | Required | Repo public, `LICENSE` file | `LICENSE` (MIT) | File exists | https://github.com/Benita2001/NimCare | DONE |
| Privacy disclosure | Organizer rules | Required | No undisclosed data collection | `PRIVACY.md` | Manual review | Repo | DONE |
| No secrets committed | Organizer rules / eng | Required | `.env`/`.env.local` never committed | `.env.example` only, gitignored | `git status` / grep; DB files purged from tracking 2026-09-18 | Repo | DONE |
| Real deployment | Organizer rules ("fully functional") | Required | Live, working, publicly reachable app | Vercel + Neon Postgres | `curl /api/health`, live smoke test | https://nimcare-app.vercel.app | DONE |

## 7. Assumption Register

| Type | Assumption | Impact if false | Validation | Deadline | Fallback | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Technical | `@nimiq/mini-app-sdk` exposes `init()`, `listAccounts()`, `sign()`, `sendBasicTransactionWithData()` as documented | Core payment flow unbuildable as designed | Read current package docs/types (Spike 1–3) | Phase 0 | Adapt to actual documented API surface | UNKNOWN |
| Technical | `sendBasicTransactionWithData()` supports enough data bytes for `NC:D:<id>` reference | Can't correlate on-chain tx to CareDrop via data field | Spike 3 | Phase 0 | Associate hash↔CareDrop server-side without relying on data field | UNKNOWN |
| Technical | A Nimiq transaction lookup API (RPC/indexer) is reachable from this dev environment without needing a run node | Can't implement server verification during hackathon build | Spike 4 | Phase 0 | Use documented public RPC/testnet endpoint; else stub verification behind explicit UNVERIFIED flag | UNKNOWN |
| Technical | `sign()` result can be verified server-side with a known message format | Can't implement signature-based session/completion | Spike 5 | Phase 0 | Fall back to trusting the wallet-address claim only for non-critical actions, clearly marked as weaker auth in `MEMORY.md`/`TRD.md` | UNKNOWN |
| Operational | This dev environment (no physical device, no confirmed Nimiq Pay app access) can still validate SDK behavior via docs/testnet/simulated calls | Spikes may end UNKNOWN rather than VERIFIED | Attempt via docs + any available testnet tooling; document explicitly if blocked | Phase 0 | Build against documented contracts, mark integration status UNVERIFIED-IN-ENV until a human tests on a real device | UNKNOWN |
| Operational | A persistent database is available in this environment (no cloud DB credentials known yet) | "Persistence" claim would be false | Check environment/tooling in Phase 1 | Phase 1 | Use local SQLite/Postgres for dev; document production deployment as a human action | UNKNOWN |

## 8. Critical Dependencies

| Dependency | Why it matters | Must be validated by | Status |
| --- | --- | --- | --- |
| `@nimiq/mini-app-sdk` | Wallet identity + payments | Phase 0 | UNKNOWN |
| Nimiq RPC / transaction lookup API | Server-side verification | Phase 0 | UNKNOWN |
| Physical Nimiq Pay access (device or org-provided test harness) | Real end-to-end demo proof | Phase 0/6 | UNKNOWN — none confirmed in this environment |
| Persistent database | Pair/CareDrop state | Phase 1 | UNKNOWN |
| Deployment platform (HTTPS, public URL) | Submission requirement | Phase 7 | UNKNOWN |

## 9. Validation Spikes

| Spike | Question being answered | Deadline | Success condition | Kill condition | Fallback | Status |
| --- | --- | --- | --- | --- | --- | --- |
| S1: Mini App provider | Does the SDK initialize and return a real address? | Phase 0 | `listAccounts()` returns a real Nimiq address on a real device | Provider API materially different from docs | Adapt to current documented API | PENDING |
| S2: Real payment | Can a tiny real NIM tx be sent and confirmed? | Phase 0 | Nimiq Pay approval UI shown, tx broadcasts, real hash returned | Cannot access a funded test wallet/device | Build the flow against documented contract, mark UNVERIFIED-IN-ENV | PENDING |
| S3: Payment with data | Does `sendBasicTransactionWithData()` carry a NimCare reference reliably? | Phase 0 | Reference retrievable from chain data | Data field unsuitable/too small | Associate hash↔CareDrop server-side instead | PENDING |
| S4: Transaction verification | Can server retrieve real tx details (sender/recipient/amount/state) by hash? | Phase 0 | Schema confirmed from a live response | No reachable verification API from this env | Document exact schema from docs; implement against it; mark integration UNVERIFIED-IN-ENV | PENDING |
| S5: Signature verification | Can a `sign()` result be verified server-side? | Phase 0 | Valid sig passes, tampered/wrong-wallet sig fails | Message/prefix format undocumented or unstable | Weaker address-claim auth for non-critical paths only | PENDING |
| S6: Invite/deeplink | Does a Nimiq Pay deeplink preserve an invite identifier? | Phase 2 | Wallet B reaches the correct invite via link | Deep routing unreliable | Root-open + short invite code | PENDING |
| S7: Production persistence | Is a real persistent DB reachable? | Phase 1 | Create→restart→read from second client succeeds | No DB access in environment | Local dev DB + documented deployment blocker | PENDING |

## 10. Major Milestones

| Milestone | Definition | Target phase | Status |
| --- | --- | --- | --- |
| Core integration proven | Spikes 1–5 resolved (VERIFIED or explicit UNKNOWN+fallback) | Phase 0 | TODO |
| Core loop works | CareDrop send→verify→complete→reveal works once end to end | Phase 3 | TODO |
| MVP complete | All P0 items in PRD implemented | Phase 4 | TODO |
| Frontend ready | DESIGN.md applied, mobile-first pass done | Phase 5 | TODO |
| Demo safe | Quality gates pass, no blank/crash states | Phase 6 | TODO |
| Submission ready | README/SUBMISSION/PRIVACY/LICENSE done, deployment status explicit | Phase 7 | TODO |

## 11. Time and Resource Budget

| Area | Budget |
| --- | --- |
| Core implementation | Majority of remaining session time |
| Sponsor integration | High priority within core implementation |
| Frontend polish | After Critical Demo Path is demo-safe |
| QA and debugging | Before submission hardening |
| Deployment | Phase 7, dependent on available credentials |
| Demo recording | Human action (requires physical device) |
| Submission | Phase 7 |
| Contingency reserve | Kept by cutting P1/P2 first if time runs short |

### Resource budget

| Resource | Expected need | Available limit | Demo reserve | Status |
| --- | --- | --- | --- | --- |
| Test NIM | Several tiny transfers + retries | UNKNOWN — no wallet funded in this environment | N/A | UNKNOWN |
| Deployment platform | One small Node/Vite app + DB | UNKNOWN — no credentials confirmed | N/A | UNKNOWN |

## 12. Demo Fixture Plan

**Demo account:** Two real Nimiq Pay wallets (Wallet A, Wallet B) — human-provided, not fabricated.
**Network / environment:** Nimiq mainnet or documented testnet, per current organizer guidance.
**Required balance or credits:** Small NIM balance on both wallets sufficient for several 0.1 NIM-scale test transfers.
**Seed data:** One Partner/Friend pair, prompt template "Coffee on me ☕", note "Thought you deserved a little treat today 💛".
**Sample input:** Amount 0.1 NIM (configurable, not hardcoded in product logic).
**Expected output:** CareDrop reaches COMPLETED, note revealed, appears in Memory for both wallets.
**Required permissions:** Wallet account access grant in Nimiq Pay for both wallets.
**Reset procedure:** Create a fresh Pair + CareDrop per demo run rather than reusing state; document in `TASKS.md`/`MEMORY.md` once backend exists.

Never include secrets or private keys in this file.

## 13. Quality Gates

### Gate 1: Integration — Phase 0 spikes resolved
### Gate 2: Core Loop — Phase 3 milestone
### Gate 3: MVP — Phase 4 milestone
### Gate 4: Frontend — Phase 5 milestone
### Gate 5: Quality — lint/typecheck/test/build green
### Gate 6: Demo — Critical Demo Path run without crash
### Gate 7: Submission — canonical docs + deployment status finalized

## 14. Current State

**Current phase:** Phase 7 (Demo/Submission hardening) — security hardening complete, real production deployment live.
**Current milestone:** Full Critical Demo Path implemented and proven end-to-end against the **live production deployment** (real cryptographic wallet auth, real Postgres, real Nimiq RPC verification) — see `MEMORY.md` for exact commands and results. 20 automated tests passing against the real production-grade database. Deployment: https://nimcare-app.vercel.app (frontend), https://nimcare-api.vercel.app (API + Neon Postgres via Vercel Marketplace).
**Primary blocker:** No confirmed physical Nimiq Pay device in this environment — blocks NIM-026 on-device UI proof only. Deployment (formerly NIM-029) is no longer blocked: a real Vercel + Neon Postgres deployment exists and was proven live.
**Next phase condition:** A human runs NIM-026 (real two-phone device test per `DEVICE_TESTING.md`); then final rule/scoring audit (NIM-030, noting the live scoring page currently shows 45/25/15/10/5/100 — re-verified 2026-09-18) and submission.

## 15. Major Blockers

* No confirmed access to a physical Nimiq Pay app in this coding environment — the full on-device UI walkthrough (`DEVICE_TESTING.md`) requires a human with a phone. All server-side logic this would exercise (auth, verification, state transitions, authorization) is proven by 20 automated tests against the real production database instead.
* Whether the production RPC (`https://rpc.nimiqwatch.com`) serves testnet data, not just the mainnet data confirmed during hardening, is unverified — see `DEVICE_TESTING.md` prerequisites before funding a demo wallet on a specific network.

## 16. Deferred Until Core Is Stable

* Mutual Loop (P1)
* Shareable completion cards (P1)
* Display names (P1)
* Relationship streaks (P1)
* All P2 items (AI, NFTs, contracts, escrow, push notifications, etc.)

## 17. Scope Change Log

_No scope changes yet. Entries will be appended here as they occur._
