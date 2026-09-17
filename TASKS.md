# TASKS — NimCare

Status values: TODO / IN_PROGRESS / DONE / BLOCKED. Update as work proceeds.

## Phase 0 — Environment & Risk Validation

- **NIM-001** [DONE] Research official Nimiq Mini App SDK + RPC docs and competition rules; record findings in `MEMORY.md`. Acceptance: verified facts distinguished from unknowns.
- **NIM-002** [TODO] Scaffold Vite + React + TS mini app in `app/`, install `@nimiq/mini-app-sdk`, implement `init()` + `listAccounts()` on a bare screen. Acceptance: `npm run dev -- --host` serves a page that calls `init()` without throwing in a normal browser (full on-device proof is a human action — see blockers).
- **NIM-003** [TODO] Scaffold Express + TS API in `server/`, SQLite via `better-sqlite3`, run the schema from `TRD.md`. Acceptance: server boots, a seed script creates a wallet row, restart + re-read proves persistence (Spike S7).
- **NIM-004** [TODO] Implement Luna/NIM conversion utilities with unit tests (integer-only). Acceptance: round-trip tests pass, floats rejected.

## Phase 1 — Core Infrastructure

- **NIM-005** [TODO] Nimiq provider adapter module (`app/src/nimiq/provider.ts`) wrapping init/listAccounts/sign/sendBasicTransactionWithData with the typed error union from `TRD.md`. Depends on NIM-002.
- **NIM-006** [TODO] API client module in the app (`app/src/api/client.ts`) with typed responses matching TRD API contracts. Depends on NIM-003.
- **NIM-007** [TODO] `.env.example` + env loading for both `app/` and `server/`. Depends on NIM-003.

## Phase 2 — Wallet Identity + Pairing

- **NIM-008** [TODO] Nonce issuance + signature verification endpoint (best-effort per Spike S5 findings; document actual verification strength achieved in `MEMORY.md`). Depends on NIM-003.
- **NIM-009** [TODO] Wallet onboarding screen: connect, handle every documented failure mode, shortened address display. Depends on NIM-005, NIM-008.
- **NIM-010** [TODO] Pair invite create/accept flow + screens (P0.4), invite token hashed + expiring. Depends on NIM-008.
- **NIM-011** [TODO] Spike S6: attempt to preserve invite id via Nimiq Pay deeplink; if unreliable, ship the short in-app code fallback as the shipped mechanism. Depends on NIM-010.

## Phase 3 — CareDrop Payment Loop (Critical Demo Path core)

- **NIM-012** [TODO] Prompt template library (10–15 curated prompts, split by relationship type) as static data. Depends on nothing (can start anytime).
- **NIM-013** [TODO] CareDrop creation screen + endpoint (template/custom prompt, amount, note, recipient review). Depends on NIM-006, NIM-010.
- **NIM-014** [TODO] Real transaction send via `sendBasicTransactionWithData`, submit hash to server, payment-state screen (waiting/cancelled/broadcast/verifying/verified/failed). Depends on NIM-005, NIM-013.
- **NIM-015** [TODO] Server verification service against `NIMIQ_RPC_URL` (Spike S4); graceful "RPC not configured" degraded state if unreachable — never fabricate VERIFIED. Depends on NIM-003.
- **NIM-016** [TODO] Recipient CareDrop screen: gift already theirs, prompt visible, note LOCKED, response field. Depends on NIM-014, NIM-015.

## Phase 4 — Response, Reveal, Memory

- **NIM-017** [TODO] Response submission + optional wallet-signed completion message (per Spike S5 outcome) + server verification → COMPLETED transition. Depends on NIM-016.
- **NIM-018** [TODO] Sealed-note reveal screen/moment. Depends on NIM-017.
- **NIM-019** [TODO] Memory timeline screen + endpoint, authorization-scoped to pair members only. Depends on NIM-017.
- **Gate**: full Critical Demo Path runs once, end to end, in dev — this is the major milestone from `PROJECT_PLAN.md`.

## Phase 5 — Frontend Refinement

- **NIM-020** [TODO] Write `DESIGN.md` (visual direction, tokens, typography, component patterns, states, accessibility). Use `hackathon-frontend` skill.
- **NIM-021** [TODO] Apply design system across all screens; mobile-first pass via the browser tool at phone viewport width; verify no horizontal overflow, comfortable touch targets.
- **NIM-022** [TODO] Polish reveal-moment animation/motion (respecting reduced-motion).

## Phase 6 — Quality and Resilience

- **NIM-023** [TODO] Implement all P0.12 error/empty/retry states not already covered incidentally by earlier tasks.
- **NIM-024** [TODO] Unit + integration tests per `TRD.md` Testing Strategy; wire lint/typecheck/test/build scripts.
- **NIM-025** [TODO] Security/privacy self-review against `TRD.md` Security/Privacy sections; write `PRIVACY.md`.
- **NIM-026** [BLOCKED — needs human] Real on-device Nimiq Pay test of the full Critical Demo Path using two real wallets (testnet funding available via hidden dev menu per `MEMORY.md`). Requires a human with a phone and the Nimiq Pay app.

## Phase 7 — Demo and Submission Hardening

- **NIM-027** [TODO] `README.md`, `LICENSE` (MIT), `.env.example` finalized, `PRIVACY.md` finalized.
- **NIM-028** [TODO] `SUBMISSION.md` with <=250 word description, judge explanation, TODO-marked links for repo/live app/demo video/social posts.
- **NIM-029** [BLOCKED — needs credentials] Production deployment (Postgres provisioning + hosting) — pending database credentials per `PROJECT_PLAN.md` blockers.
- **NIM-030** [TODO] Final rule audit against `miniappscompetition.com/rules` and the Winning Requirements Matrix in `PROJECT_PLAN.md`.

## Scope change protocol

Any task not listed here that gets proposed later must record: rubric/P0 impact, effort, new risk, and what gets cut — append to `PROJECT_PLAN.md` § Scope Change Log before starting it.
