# TRD — NimCare

## Technical objective

Implement the Critical Demo Path (wallet connect → pair → real NIM CareDrop → server-verified → respond/complete → reveal → Memory) as a Nimiq Pay Mini App, using only verified SDK/API behavior (see `MEMORY.md`), with no fabricated persistence or verification.

## Verified hackathon constraints

- Must run inside Nimiq Pay via the official Mini Apps Framework (`@nimiq/mini-app-sdk`).
- Must integrate real NIM (and/or USDT — NimCare uses NIM only per PRD non-goals).
- Public GitHub repo (https://github.com/Benita2001/NimCare), MIT License, no secrets committed, fully functional (not a prototype).
- Deadline 2026-09-18 23:59 UTC per user instruction (see `MEMORY.md` for a noted date discrepancy on the organizer's own rules page).

## Environment constraints

- Dev environment: Node v24.13.0, npm 11.6.2, no `psql`, `sqlite3` available, no confirmed cloud DB credentials, no confirmed physical Nimiq Pay device/funded wallet.
- Local mini-app testing requires LAN HTTP (not HTTPS) per official docs — secure-context-only browser APIs must be avoided or given fallbacks (`crypto.getRandomValues()` instead of `crypto.randomUUID()`).

## Stack (Decision)

- **Frontend**: Vite + React + TypeScript (per official tutorial's supported options; React chosen for ecosystem familiarity and shadcn/ui compatibility for the design system).
- **Nimiq integration**: `@nimiq/mini-app-sdk` (latest published version at install time — resolve exact version from npm at scaffold time, commit lockfile).
- **Backend**: Node.js + TypeScript, a minimal HTTP API (Express) colocated in the same repo (`server/`). No separate microservices, no queues, no Redis.
- **Persistence (Decision, dev)**: SQLite via `better-sqlite3`, file-based, schema written in portable SQL (see Data Model). **Known gap**: production deployment needs a real managed Postgres (or equivalent) instance — this requires credentials not present in this environment; documented as a human action in `PROJECT_PLAN.md`.
- **Auth**: wallet-native — nonce-challenge + `sign()` verification (see Authentication below). No email/password.

## Architecture summary

```
Nimiq Pay (host)
  └─ NimCare Mini App (Vite/React SPA)
       ├─ Nimiq provider adapter (wraps @nimiq/mini-app-sdk init/listAccounts/sign/sendBasicTransactionWithData)
       ├─ API client (fetch wrapper) → NimCare API
       └─ UI (screens per PRD "Required screens")

NimCare API (Node/Express, same repo, server/)
  ├─ Auth routes: nonce issue, session verify (signature check)
  ├─ Pair routes: create invite, accept invite, get pair
  ├─ CareDrop routes: create, mark payment submitted, get, respond, complete
  ├─ Verification service: polls/looks up tx by hash via Nimiq RPC (NIMIQ_RPC_URL)
  └─ SQLite persistence (dev) / Postgres (production, pending credentials)
```

## Client responsibilities

- Initialize the SDK, request accounts, render shortened address, handle every documented failure (`PermissionDeniedError`, provider not ready, consensus not established).
- Never construct or trust a "funded" state locally — always reflect the server's verification status.
- Build the transaction request (`recipient`, `value` in Luna, `data` reference) and hand off to `sendBasicTransactionWithData`; on hash return, immediately notify the server (`PAYMENT_SUBMITTED`) and poll for verification status.
- Request `sign()` for session establishment and for completion confirmation, sending the resulting `{publicKey, signature}` to the server.

## Server responsibilities

- Issue single-use nonces for session challenges and completion actions; invalidate after use.
- Verify signatures server-side (library/approach: TBD in Spike S5 — Nimiq address/public-key/signature verification must use an `@nimiq/core`-compatible or equivalent verified library; do not hand-roll curve crypto).
- Independently verify submitted transactions against Nimiq RPC data before advancing CareDrop status — never trust a client-supplied "success."
- Enforce pair-membership authorization on every CareDrop/Memory/sealed-note read.
- Own the CareDrop state machine (see Data Model) and reject invalid transitions.

## Persistence

SQLite (dev) file at `server/data/nimcare.db`, WAL mode, schema below. Integers used throughout for Luna amounts (no floats). Production: swap the `better-sqlite3` adapter for a Postgres client behind the same repository interface — deferred until credentials exist (Phase 7 blocker).

## Nimiq integration (Known / Decision / Unknown)

| Item | Status | Detail |
| --- | --- | --- |
| `init()`, `listAccounts()`, `sign()`, `isConsensusEstablished()`, `getBlockNumber()` | Known | Documented signatures, see `MEMORY.md` |
| `sendBasicTransactionWithData()` | Known (shape) / Unknown (exact data byte limit) | Documented example uses short plain string; limit unconfirmed — Spike S3 |
| Server-side transaction lookup by hash | Known (RPC method exists) / Unknown (no confirmed public/hosted RPC endpoint) | Needs `NIMIQ_RPC_URL`; see Assumption Register in `PROJECT_PLAN.md` |
| Signature verification algorithm/library | Unknown | Spike S5 — must confirm exact message hashing/format before trusting it for auth |
| Deeplink/invite preservation via Nimiq Pay | Unknown | Not documented in fetched tutorial pages — fallback: in-app short invite code, no reliance on deep link query params |
| Testnet funding | Known | Hidden dev menu → Testnet → "Get free NIM" (110,000 Luna/request) — resolves demo funding risk once a human has the app |

## Authentication (wallet session)

1. Client requests a nonce: `POST /api/auth/nonce { address }` → server stores `{nonce, address, expiresAt}`.
2. Client calls `sign(nonce-derived challenge string)` via SDK.
3. Client sends `POST /api/auth/verify { address, publicKey, signature, nonce }`.
4. Server verifies the signature against the documented `sign()` output format (message format/prefix TBD — Spike S5) and that the public key derives the claimed address.
5. On success: nonce invalidated, session token (opaque, server-generated, stored server-side, referenced by an httpOnly cookie or bearer token) issued.
6. **Fallback if S5 fails**: sessions may temporarily rely on the claimed address alone for **non-privileged reads** only; every privileged/state-changing action (creating a CareDrop, submitting a payment, completing a CareDrop) still requires a fresh `sign()` challenge at the point of action, since those already require wallet confirmation for the underlying transaction/signature. This is documented explicitly as a weaker interim posture, not claimed as full session security, until S5 resolves.

## Transaction flow

1. Sender picks recipient (paired wallet), template/prompt, amount (Luna), note.
2. Client: `POST /api/caredrops` → server creates row in `DRAFT`, returns `id` + short reference.
3. Client: `sendBasicTransactionWithData({ recipient, value, data: 'NC:D:' + shortId })`.
4. On hash: `POST /api/caredrops/:id/submit { txHash }` → status `AWAITING_PAYMENT` → `PAYMENT_SUBMITTED`.
5. Server verification job looks up `txHash` via `NIMIQ_RPC_URL`; checks sender, recipient, value, (and data reference if reliably retrievable per Spike S3); on match → `PAYMENT_VERIFIED` → `DELIVERED`; on mismatch/failure → `FAILED` with a specific reason surfaced to the client.
6. Client polls `GET /api/caredrops/:id` until a terminal or delivered state; UI never claims "sent" before `PAYMENT_VERIFIED`.

## Transaction verification

- Implementation: `server/services/verifyTransaction.ts`, calls `NIMIQ_RPC_URL` JSON-RPC `getTransactionByHash`.
- Checks: existence, sender == claimed sender, recipient == CareDrop recipient wallet, value == CareDrop amount_luna, inclusion/confirmation state per whatever the live schema returns (schema unconfirmed pending an actual RPC endpoint — Spike S4).
- If `NIMIQ_RPC_URL` is unset or unreachable: CareDrop stays `PAYMENT_SUBMITTED` and the UI shows "Verifying — RPC not configured" rather than a fabricated verified state. This is a real, disclosed limitation, not a bug to hide.

## API contracts (initial, subject to Spike outcomes)

- `POST /api/auth/nonce` → `{ nonce: string, expiresAt: string }`
- `POST /api/auth/verify` → `{ sessionToken: string }`
- `POST /api/pairs/invite` → `{ inviteId: string, token: string, expiresAt: string }`
- `POST /api/pairs/accept` → `{ pairId: string, status: 'ACCEPTED' }`
- `GET /api/pairs/:id` → pair + members + relationship type
- `POST /api/caredrops` → `{ id, recipient, amountLuna, promptText, sealedNote, reference }`
- `POST /api/caredrops/:id/submit` → `{ txHash }`
- `GET /api/caredrops/:id` → full state incl. verification status (sealed note omitted unless authorized+completed)
- `POST /api/caredrops/:id/respond` → `{ responseText, signature? }`
- `GET /api/pairs/:id/memory` → list of completed CareDrops (summary fields only)

## Data model

```sql
CREATE TABLE wallet (
  address TEXT PRIMARY KEY,
  public_key TEXT,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE pair (
  id TEXT PRIMARY KEY,
  member_a_wallet TEXT NOT NULL REFERENCES wallet(address),
  member_b_wallet TEXT REFERENCES wallet(address),
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('PARTNER','FRIEND','FAMILY')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','ACCEPTED')),
  created_at TEXT NOT NULL,
  paired_at TEXT
);

CREATE TABLE pair_invite (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pair(id),
  token_hash TEXT NOT NULL,
  created_by_wallet TEXT NOT NULL REFERENCES wallet(address),
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','CONSUMED','EXPIRED'))
);

CREATE TABLE caredrop (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pair(id),
  sender_wallet TEXT NOT NULL REFERENCES wallet(address),
  recipient_wallet TEXT NOT NULL REFERENCES wallet(address),
  prompt_id TEXT,
  prompt_text TEXT NOT NULL,
  amount_luna INTEGER NOT NULL CHECK (amount_luna > 0),
  sealed_note TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN
    ('DRAFT','AWAITING_PAYMENT','PAYMENT_SUBMITTED','PAYMENT_VERIFIED','DELIVERED','COMPLETED','FAILED')),
  transaction_hash TEXT,
  blockchain_verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED'
    CHECK (blockchain_verification_status IN ('UNVERIFIED','PENDING','VERIFIED','MISMATCH','RPC_UNAVAILABLE')),
  created_at TEXT NOT NULL,
  funded_at TEXT,
  completed_at TEXT
);

CREATE TABLE caredrop_response (
  id TEXT PRIMARY KEY,
  caredrop_id TEXT NOT NULL REFERENCES caredrop(id),
  author_wallet TEXT NOT NULL REFERENCES wallet(address),
  response_text TEXT NOT NULL,
  completion_signature TEXT,
  created_at TEXT NOT NULL
);
```

Allowed state machine transitions: `DRAFT → AWAITING_PAYMENT → PAYMENT_SUBMITTED → PAYMENT_VERIFIED → DELIVERED → COMPLETED`, with `FAILED` reachable from `AWAITING_PAYMENT`, `PAYMENT_SUBMITTED`, or `PAYMENT_VERIFIED`. No other transitions permitted; enforced in a single server-side state-machine function, not scattered across route handlers.

## Security

- No private keys or seed phrases ever touch the server or are stored anywhere.
- Sealed note and response text only returned to authenticated, pair-member wallets, and only after `COMPLETED`.
- Invite tokens stored hashed (`token_hash`), never plaintext; single-use; expiring.
- All amount arithmetic in integer Luna; reject non-integer/negative amounts at the API boundary.
- Rate-limit nonce issuance and CareDrop creation per wallet to reduce spam (P0-light — simple in-memory or DB-backed counter, no external service).

## Privacy

- No private notes/messages on-chain — only the short `NC:D:<id>` reference.
- No third-party analytics/tracking in P0.
- `PRIVACY.md` (Phase 7) documents exactly what's stored, why, and what's on/off chain — no "end-to-end encrypted" claim unless genuinely implemented.

## Error handling

Every SDK/API call site maps to a specific UI state per PRD P0.12 list — implemented as a small typed result union (`Ok | { kind: 'ProviderUnavailable' | 'UserRejected' | 'InsufficientBalance' | ... }`) rather than generic try/catch-and-alert.

## Environment variables

`.env.example` (Phase 1) will define, with no real values committed:
- `PORT`
- `DATABASE_PATH` (SQLite dev) / `DATABASE_URL` (future Postgres)
- `NIMIQ_RPC_URL` (optional; verification degrades gracefully if unset)
- `SESSION_SECRET`
- `NODE_ENV`

## Deployment

Target: simplest platform already available to the user (Vercel is present in this session's tooling). Decision pending Phase 7: if Vercel is used, the Express API needs adaptation to Vercel Functions (Fluid Compute, Node runtime) and SQLite is unsuitable for a stateless serverless deployment (ephemeral filesystem) — production will need a real managed database reachable over the network (e.g. a Postgres from the Vercel Marketplace) before deploying. This is called out as an explicit human action requiring credentials/provisioning, not something to fake.

## Testing strategy

- Unit: Luna⇄NIM conversion, CareDrop state machine transition guard, invite expiry/consumption, amount validation, authorization checks.
- Integration: API routes against the SQLite dev DB (create pair → invite → accept → caredrop → submit → mock-verify → respond → complete → memory read).
- Nimiq wallet interactions: mocked provider only in automated tests, explicitly never presented as proof of real integration (per Hackathon OS rule) — real integration proof comes from manual device testing, documented separately.
- Static gates: lint, typecheck, build must pass before Quality gate.

## Technical risks

See `PROJECT_PLAN.md` Risk Register / Validation Spikes (S1–S7) — the two carrying the most build risk are S4 (no confirmed public RPC endpoint for verification) and S5 (unverified signature message format).

## Technical acceptance criteria

See `PRD.md` Acceptance Criteria (P0) — this TRD implements them; do not duplicate here.

## Unresolved technical questions

- Exact `sendBasicTransactionWithData` data byte limit (S3).
- A concretely reachable Nimiq RPC endpoint for server verification, or confirmation that we must run our own node (S4).
- Exact `sign()` message/hash format for server-side verification and which library performs it (S5).
- Whether Nimiq Pay deeplinks reliably preserve invite query params (S6) — currently assumed no, building the safer in-app short-code fallback first.
