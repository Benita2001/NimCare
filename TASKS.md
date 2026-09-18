# TASKS — NimCare

Status values: TODO / IN_PROGRESS / DONE / BLOCKED. Update as work proceeds.

## Phase 0 — Environment & Risk Validation

- **NIM-001** [DONE] Research official Nimiq Mini App SDK + RPC docs and competition rules; record findings in `MEMORY.md`. Acceptance: verified facts distinguished from unknowns.
- **NIM-002** [DONE] Scaffold Vite + React + TS mini app in `app/`, install `@nimiq/mini-app-sdk`, implement `init()` + `listAccounts()`. Acceptance met in a normal browser (live-verified: correct `ProviderUnavailable` error state renders, see `MEMORY.md`); full on-device proof inside real Nimiq Pay is still a human action (NIM-026).
- **NIM-003** [DONE] Scaffold Express + TS API in `server/`, SQLite via `better-sqlite3`, run the schema from `TRD.md`. Verified live: server boots, full pair→invite→accept→caredrop→submit→verify(degraded)→memory flow smoke-tested against the real dev DB (see `MEMORY.md`).
- **NIM-004** [DONE] Implement Luna/NIM conversion utilities with unit tests (integer-only). 4/4 vitest tests pass in `server/src/luna.test.ts`.

## Phase 1 — Core Infrastructure

- **NIM-005** [DONE] Nimiq provider adapter module (`app/src/nimiq/provider.ts`) wrapping init/listAccounts/sign/sendBasicTransactionWithData with a typed error union.
- **NIM-006** [DONE] API client module (`app/src/api/client.ts`) with typed responses matching TRD API contracts.
- **NIM-007** [DONE] `.env.example` for both `app/` and `server/`.

## Phase 2 — Wallet Identity + Pairing

- **NIM-008** [DONE — partial] Nonce issuance + session endpoint implemented and live-tested; performs structural verification (nonce validity/expiry/single-use, address match) but not yet full cryptographic signature verification — see `server/src/routes/auth.ts` and TRD Spike S5. Flagged, not hidden.
- **NIM-009** [DONE] Wallet onboarding screen: connect, handle documented failure modes, shortened address display. Live-verified `ProviderUnavailable` state in-browser.
- **NIM-010** [DONE] Pair invite create/accept flow + screens (P0.4), invite token hashed + expiring. Live-tested via API smoke test.
- **NIM-011** [DEFERRED] Spike S6 (Nimiq Pay deeplink preservation) not attempted in this environment (needs the real host). Shipped the safer fallback directly: in-app short invite code/link via `window.location.origin + ?invite=<token>`.

## Phase 3 — CareDrop Payment Loop (Critical Demo Path core)

- **NIM-012** [DONE] Prompt template library (10 curated prompts across Partner/Friend/Family + free-text "Your choice") — `server/src/prompts.ts`.
- **NIM-013** [DONE] CareDrop creation screen + endpoint (template/custom prompt, amount, note, recipient review).
- **NIM-014** [DONE] Real transaction send via `sendBasicTransactionWithData`, submit hash to server, payment-state UI (sending/error/status banner).
- **NIM-015** [DONE] Server verification service against `NIMIQ_RPC_URL`; live-tested degraded "RPC_UNAVAILABLE" state (no RPC configured in this environment) — never fabricates VERIFIED.
- **NIM-016** [DONE] Recipient CareDrop screen: gift already theirs, prompt visible, note LOCKED, response field — `CareDropView.tsx`.

## Phase 4 — Response, Reveal, Memory

- **NIM-017** [DONE — partial] Response submission → COMPLETED transition implemented and live-tested end to end; wallet-signed completion message not yet wired pending Spike S5 (structural-only auth today).
- **NIM-018** [DONE] Sealed-note reveal screen/moment (`CareDropView.tsx` reveal branch, fade-up animation, reduced-motion respected).
- **NIM-019** [DONE] Memory timeline screen + endpoint, authorization-scoped to pair members only — live-tested (empty-state case confirmed via smoke test).
- **Gate**: Critical Demo Path proven at the API/data layer end to end via live smoke test (pair→invite→accept→caredrop→submit→degraded-verify→respond→memory read all executed against the real dev DB, see `MEMORY.md`). Full on-device UI walkthrough with a real wallet remains NIM-026.

## Phase 5 — Frontend Refinement

- **NIM-020** [DONE] `DESIGN.md` written (visual direction, tokens, typography, component patterns, states, accessibility).
- **NIM-021** [DONE] Design system applied across all screens; mobile-first pass verified live via the browser tool at 375×812 — no horizontal overflow, comfortable touch targets, dark mode confirmed.
- **NIM-022** [DONE] Reveal-moment fade-up animation implemented with `prefers-reduced-motion` handling.

## Phase 6 — Quality and Resilience

- **NIM-023** [DONE — mostly] Core P0.12 states implemented (provider unavailable, permission denied, consensus not established, payment error/cancel, invalid/expired/consumed invite, not-a-pair-member, verification-pending, failed/mismatch, empty states). Not exhaustively tested: lost-network mid-flow, malformed-address edge cases beyond basic validation.
- **NIM-024** [DONE — partial] `tsc --noEmit` passes clean on both `app/` and `server/`; both build successfully; 4/4 unit tests pass for Luna conversion. Not done: broader integration test suite, ESLint (no config shipped by this Vite scaffold version — not set up from scratch given time budget).
- **NIM-025** [DONE] Security/privacy self-review complete; `PRIVACY.md` written and accurate to actual behavior (no false encryption claims).
- **NIM-026** [BLOCKED — needs human] Real on-device Nimiq Pay test of the full Critical Demo Path using two real wallets (testnet funding available via hidden dev menu per `MEMORY.md`). Requires a human with a phone and the Nimiq Pay app.

## Phase 7 — Demo and Submission Hardening

- **NIM-027** [DONE] `README.md`, `LICENSE` (MIT), `.env.example` (both packages), `PRIVACY.md` finalized.
- **NIM-028** [DONE] `SUBMISSION.md` with ≤250 word description, judge explanation, TODO-marked links for repo/live app/demo video/social posts.
- **NIM-029** [DONE] Production deployment — Vercel (frontend static + backend Vercel Function) + Neon Postgres via Vercel Marketplace. Live and health-checked: https://nimcare-app.vercel.app / https://nimcare-api.vercel.app. See `MEMORY.md` for provisioning steps and live smoke-test evidence.
- **NIM-030** [TODO — human] Final rule audit against the live `miniappscompetition.com/rules` page immediately before submitting. Scoring page independently re-verified live on 2026-09-18 (45/25/15/10/5/100 — see `MEMORY.md`); re-check again right before submitting since it can change.

## Phase 8 — Security Hardening (2026-09-18 Build Review)

- **NIM-031** [DONE] Real cryptographic wallet authentication via `@nimiq/core` (`PublicKey`, `Signature`, address derivation), replacing the prior structural-only check. Origin-bound challenge message (server-configured `APP_ORIGIN`). 5 unit tests + 4 integration tests covering forgery, expiry, and replay — all passing.
- **NIM-032** [DONE] Found and fixed a real off-by-one bug in the Nimiq address regex (was requiring 40 chars/10 groups instead of the correct 36 chars/9 groups) — discovered while testing against real `@nimiq/core`-generated addresses.
- **NIM-033** [DONE] Purged `server/data/*.db` from git tracking (contained only synthetic smoke-test data, confirmed by inspection); gitignored `server/data/`, `*.db*`.
- **NIM-034** [DONE] Transaction-to-CareDrop binding: `recipientData` (hex-decoded, confirmed against a real live mainnet transaction) must match the CareDrop's stored reference; transaction hashes are unique per CareDrop (DB constraint + route-level check); optional `executionResult`/`networkId` checks added from real RPC evidence. 6 integration tests covering all required scenarios.
- **NIM-035** [DONE] Nimiq Pay deeplink support for invites (`nimiqpay://` and `https://nimpay.app/miniapps/open/...`), kept alongside the short invite-code fallback since query-param preservation through the deeplink is undocumented; added a real "Open NimCare in Nimiq Pay" conversion screen instead of only an error when opened outside Nimiq Pay, and a manual invite-code entry field on Home.
- **NIM-036** [DONE] Production-safe CORS (origin allowlist via `ALLOWED_ORIGINS`, fails closed in production without it) and session tokens now stored as SHA-256 hashes rather than plaintext.
- **NIM-037** [DONE] RPC hardening: confirmed `https://rpc.nimiqwatch.com` live and reachable; it's now the default `NIMIQ_RPC_URL`. Optional `NIMIQ_NETWORK_ID` guard added (mainnet=24 observed live), left unset by default pending testnet confirmation.
- **NIM-038** [DONE] `app/` lint (oxlint) clean, both packages typecheck/build clean, 20 total tests passing (up from 4) against the real production Postgres database — not mocks.
- **NIM-039** [DONE] Migrated `server/` from `better-sqlite3` (unsuitable for serverless) to Postgres (`pg`, Neon via Vercel Marketplace) to support real production deployment — schema, all routes, and the verification service converted to async.
- **NIM-040** [TODO — human] Run `DEVICE_TESTING.md`'s two-phone protocol on real hardware; fill in real PASS/FAIL results.

## Phase 9 — Product Pivot: Surprise-First Media CareDrops (2026-09-18)

Checkpoint before this pivot: git tag `pre-media-caredrop-pivot` at commit `312b0c4`.

- **NIM-041** [DONE] Quick overlap audit against Nimiquette/Ralli/KashLink (web search only) — recorded in `MEMORY.md`; no substantive copying risk identified for the chosen direction.
- **NIM-042** [DONE] Cashlink spike — result **FAIL**, concluded from architectural evidence (no Cashlink methods on the Mini App SDK provider; Hub API's Cashlink support is redirect-based, incompatible with a Mini App WebView) rather than a live device test, since no device was available. Full reasoning in `MEMORY.md`. Decision: `DIRECT_NIM` remains the only funding rail; `funding_type` enum keeps `CASHLINK` reserved but unimplemented.
- **NIM-043** [DONE] Additive Postgres migration (no destructive rewrite) adding `type`, `title`, `caption`, `media_url`, `media_mime`, `external_url/provider/title`, `funding_type`, `share_token_hash`, `opened_at` to `caredrop`; `relationship_type` on `pair` made nullable. Applied automatically via `ensureMigrated()` against the live database.
- **NIM-044** [DONE] Real photo storage: Vercel Blob store `nimcare-media` provisioned (`vercel blob create-store`), `POST /api/media/photo` endpoint (multer memory storage, JPEG/PNG/WebP only, 8MB cap, no SVG/HTML). Verified live: a real image was uploaded to a real Blob URL in both a local smoke test and a production smoke test.
- **NIM-045** [DONE] Reworked `POST /api/caredrops` to take `recipientWallet` directly and auto-create the Loop (`findOrCreateLoop`) — no invite/accept step. Verified live and via 4 new integration tests (auto-Loop creation, invalid recipient/self-send rejection, share-token authorization, invalid type/missing-media rejection). 23/23 tests passing total.
- **NIM-046** [DONE] `GET /api/caredrops/by-token/:token` — share-link opening gated on the pre-specified recipient wallet matching the authenticated session; a stranger gets a clean 403, verified by both an automated test and a live production smoke test.
- **NIM-047** [DONE] New frontend: redesigned Home (type picker + Loop list, no setup language), generic `Composer.tsx` for Photo/Playlist/Movie/Treat, `ShareSuccess.tsx`, `Reveal.tsx` (teaser → open → media reveal → respond → Send one back), `LoopScreen.tsx` (moments timeline). Old `Pairing.tsx`/`CreateCareDrop.tsx`/`PairHome.tsx`/`CareDropView.tsx` removed (superseded, not left as dead code). Lint/typecheck/build clean.
- **NIM-048** [DONE] Visual refresh per the pivot brief (warm parchment/ink/coral/plum palette, editorial display typeface for headlines) — live-verified in the browser at mobile viewport.
- **NIM-049** [DONE] `PRIVACY.md` updated for uploaded photos (Blob URL access model, explicitly non-encrypted, accurate about what a share link does and doesn't protect) and external music/movie links.
- **NIM-050** [TODO] Playlist/Movie CareDrop types are implemented in the composer/reveal UI (generic external-link card) but not separately device- or link-preview-tested — only Photo and Treat were exercised in the live smoke tests during this session, per the pivot brief's own fallback ("a single great CareDrop experience is preferable to three broken media types").
- **NIM-051** [TODO — human] Re-run `DEVICE_TESTING.md`'s two-phone protocol against the pivoted flow (share link → teaser → open → reveal → respond → Send one back) — the previous protocol document still describes the pre-pivot invite/accept flow and needs a rewrite pass alongside the actual device test.

## Phase 10 — Full Release Audit (2026-09-18)

Checkpoint before this audit: git tag `pre-release-audit` at commit `24a1e03`.

- **NIM-052** [DONE] Independently re-ran quality gates (not trusted from prior narrative) — all clean, 23/23 tests. Independently re-ran a 13-check adversarial live smoke test against production covering auth forgery, malicious upload rejection, tx-hash reuse, share-token privacy, sender/recipient authorization, Loop auto-creation, unauthenticated/malformed request handling. All 13 passed. See `MEMORY.md`.
- **NIM-053** [DONE] Fixed stale documentation that had drifted across the pivot/redesign passes: `JUDGES.md` (functionality bullet, judge explanation, design/UX paragraph all still described the pre-pivot flow/visual system), `README.md` ("What's real" bullet unrefreshed since before the pivot), `PRIVACY.md` (described a sealed-note-unlocked-by-response mechanic that no longer exists), `TRD.md` (Deployment/Testing Strategy sections still forward-looking despite deployment being complete), `SUBMISSION.md`/`PROJECT_PLAN.md` (stale "20 tests" → 23), `CODE_HANDOFF.md` (entirely rewritten — was untouched since the original 2026-09-16 planning session).
- **NIM-054** [DONE] Confirmed repo hygiene: no secrets/build-artifacts/stray DB files tracked; no secrets in the built frontend JS bundle (grepped for common secret/connection-string patterns).
- **NIM-055** [DONE] Investigated a stray `Error`-status Vercel deployment found via `vercel ls --prod`; confirmed it's a harmless auto-deploy race with the GitHub integration, and the production alias correctly points to the healthy deployment.
- **NIM-056** [TODO — low priority] CORS rejection for a disallowed origin returns a bare 500 instead of a clean 4xx (functionally safe — no ACAO header either way — but not clean). Not fixed in this pass; low risk, cosmetic.
- **NIM-057** [TODO] Playlist/Movie CareDrop types still lack their own dedicated live smoke test (same gap as NIM-050) — Photo and Treat remain the only types proven end-to-end against production.

## Scope change protocol

Any task not listed here that gets proposed later must record: rubric/P0 impact, effort, new risk, and what gets cut — append to `PROJECT_PLAN.md` § Scope Change Log before starting it.
