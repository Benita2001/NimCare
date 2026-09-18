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
- **Persistence**: real Postgres (Neon, provisioned via the Vercel Marketplace) — used in both dev and production. SQLite/`better-sqlite3` was the original dev-only choice and has been **fully migrated away from**, not deferred; there is no SQLite code path left in `server/`. `server/src/db/index.ts` requires `DATABASE_URL` and throws on startup if it's unset.
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
  └─ Postgres persistence (Neon, real in both dev and production)
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

Real Postgres (Neon) in both dev and production — see `server/src/db/index.ts` and `server/src/db/schema.sql`. Integers used throughout for Luna amounts (no floats). Local dev connects to the same Neon project via a `DATABASE_URL` pulled with `vercel env pull` (see README.md).

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

## API contracts (2026-09-18 pivot — supersedes the pre-pivot list below the note)

> Pre-pivot endpoints (`POST /api/pairs/invite`, `POST /api/pairs/accept`) still exist in `server/src/routes/pairs.ts` for backward compatibility but are no longer part of the primary UX — see `MEMORY.md`.

- `POST /api/auth/nonce` → `{ nonce: string, expiresAt: string }`
- `POST /api/auth/verify` → `{ sessionToken: string, address: string }`
- `POST /api/caredrops` (body: `{ recipientWallet, type, title?, caption?, mediaUrl?, mediaMime?, externalUrl?, amountLuna }`) → `{ id, recipient, amountLuna, reference, shareToken }` — auto-creates the Loop between sender and recipient if it doesn't already exist
- `POST /api/media/photo` (multipart, field `photo`) → `{ url, mime }` — uploads to Vercel Blob, JPEG/PNG/WebP only, 8MB cap
- `GET /api/caredrops/types` → curated `CAREDROP_TYPES` list (Photo/Playlist/Movie/Treat headline copy)
- `POST /api/caredrops/:id/submit` → `{ id, status }`
- `GET /api/caredrops/:id` → full state (sender or recipient only)
- `GET /api/caredrops/by-token/:token` → full state, but only for the wallet-authenticated request whose address matches the CareDrop's `recipient_wallet` (or the sender); sets `opened_at` on first recipient open
- `POST /api/caredrops/:id/respond` → `{ caredrop }`
- `GET /api/pairs/mine` → the caller's Loops
- `GET /api/pairs/:id` → Loop + members
- `GET /api/pairs/:id/memory` → Loop's moment history (CareDrops in `DELIVERED` or `COMPLETED` state)

## Data model

```sql
CREATE TABLE wallet (
  address TEXT PRIMARY KEY,
  public_key TEXT,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- relationship_type is nullable post-pivot: a Loop forms automatically on
-- first CareDrop exchange, with nobody asked to classify the relationship.
CREATE TABLE pair (
  id TEXT PRIMARY KEY,
  member_a_wallet TEXT NOT NULL REFERENCES wallet(address),
  member_b_wallet TEXT REFERENCES wallet(address),
  relationship_type TEXT CHECK (relationship_type IN ('PARTNER','FRIEND','FAMILY')),
  status TEXT NOT NULL CHECK (status IN ('PENDING','ACCEPTED')),
  created_at TEXT NOT NULL,
  paired_at TEXT
);

-- Legacy pre-pivot invite/accept flow; kept for backward compatibility,
-- not used by the current primary UX.
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
  -- pre-pivot fields, nullable now, superseded by type/title/caption below
  prompt_id TEXT,
  prompt_text TEXT,
  sealed_note TEXT,
  type TEXT NOT NULL DEFAULT 'TREAT' CHECK (type IN ('PHOTO','PLAYLIST','MOVIE','TREAT')),
  title TEXT,
  caption TEXT,
  media_url TEXT,
  media_mime TEXT,
  external_url TEXT,
  external_provider TEXT,
  external_title TEXT,
  funding_type TEXT NOT NULL DEFAULT 'DIRECT_NIM' CHECK (funding_type IN ('DIRECT_NIM','CASHLINK')),
  share_token_hash TEXT,
  opened_at TEXT,
  amount_luna INTEGER NOT NULL CHECK (amount_luna > 0),
  reference TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN
    ('DRAFT','AWAITING_PAYMENT','PAYMENT_SUBMITTED','PAYMENT_VERIFIED','DELIVERED','COMPLETED','FAILED')),
  failure_reason TEXT,
  transaction_hash TEXT UNIQUE,
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

Allowed state machine transitions unchanged by the pivot: `DRAFT → AWAITING_PAYMENT → PAYMENT_SUBMITTED → PAYMENT_VERIFIED → DELIVERED → COMPLETED`, with `FAILED` reachable from `AWAITING_PAYMENT`, `PAYMENT_SUBMITTED`, or `PAYMENT_VERIFIED`. `opened_at` is a timestamp layered on top (set the first time the recipient opens via share link), not a separate state — there is no "claim" step distinct from `DELIVERED` since direct NIM payment already puts the funds in the recipient's wallet at that point. Migration applied additively (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) against the live production database — see `server/src/db/schema.sql` and `MEMORY.md`.

## Funding model (Cashlink spike result)

`funding_type` models `DIRECT_NIM` (implemented, the only path in use) and `CASHLINK` (reserved, unimplemented). The Cashlink spike concluded FAIL from architectural evidence: `@nimiq/mini-app-sdk`'s provider has no Cashlink methods, and `@nimiq/hub-api`'s Cashlink support is a separate, redirect-based flow (`HubApi.RedirectRequestBehavior`) incompatible with staying inside a Mini App's Nimiq Pay-hosted WebView. Full reasoning and sources in `MEMORY.md`. Practical consequence: the sender must know the recipient's wallet address at CareDrop creation time (selected from an existing Loop, or entered directly) — there is no NULL-recipient "first opener claims it" flow, which also means CareDrop content access is gated by a simple "does the authenticated wallet match the pre-specified recipient" check rather than an atomic first-claim race.

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
- `DATABASE_URL` (real Postgres connection string, required — server throws on startup without it)
- `NIMIQ_RPC_URL` (optional; verification degrades gracefully if unset)
- `SESSION_SECRET`
- `NODE_ENV`

## Deployment (done — see MEMORY.md for provisioning evidence)

Live on Vercel: `app/` deploys as a static site, `server/` deploys as a Vercel Function (`server/api/index.ts` + `server/vercel.json`, Express app served unchanged). Database is real Postgres (Neon, provisioned via `vercel integration add neon` under the Vercel Marketplace) — SQLite was migrated away from entirely (unsuitable for a stateless serverless filesystem) rather than being a future TODO. Photo storage is a real Vercel Blob store (`nimcare-media`). Production URLs: https://nimcare-app.vercel.app, https://nimcare-api.vercel.app.

## Testing strategy

- Unit: Luna⇄NIM conversion, `@nimiq/core` signed-message verification (valid/forged/wrong-key/address-mismatch/malformed-hex).
- Integration (`server/src/integration.test.ts`, run against the real production Postgres database, not an in-memory/mock DB): auth forgery/expiry/replay rejection, direct-to-wallet CareDrop creation with automatic Loop formation (no invite/accept step — that flow is legacy and no longer exercised by these tests), invalid recipient/self-send/type/missing-media rejection, share-token recipient authorization, and all 6 transaction-verification scenarios (match, recipient/amount/reference mismatch, duplicate-hash rejection, RPC-unavailable graceful degradation).
- Nimiq wallet interactions: real `@nimiq/core` keypairs used for signature tests (not mocked) — proves the cryptography genuinely round-trips; the Mini App SDK's `window.nimiq` provider itself is still only exercised via a live in-browser check outside Nimiq Pay (the `ProviderUnavailable` path), not inside real Nimiq Pay — that remains a human/device action, documented separately in `DEVICE_TESTING.md`.
- Static gates: lint (oxlint on `app/`), typecheck, build must pass on both packages — currently green.

## Technical risks

See `PROJECT_PLAN.md` Risk Register / Validation Spikes (S1–S7) — the two carrying the most build risk are S4 (no confirmed public RPC endpoint for verification) and S5 (unverified signature message format).

## Technical acceptance criteria

See `PRD.md` Acceptance Criteria (P0) — this TRD implements them; do not duplicate here.

## Unresolved technical questions

- Exact `sendBasicTransactionWithData` data byte limit (S3).
- A concretely reachable Nimiq RPC endpoint for server verification, or confirmation that we must run our own node (S4).
- Exact `sign()` message/hash format for server-side verification and which library performs it (S5).
- Whether Nimiq Pay deeplinks reliably preserve invite query params (S6) — currently assumed no, building the safer in-app short-code fallback first.
