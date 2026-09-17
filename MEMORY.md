# MEMORY — NimCare

Durable discoveries only. Not a transcript.

## Verified facts (from official docs, 2026-09-16)

- **SDK**: `@nimiq/mini-app-sdk` (npm), v0.1.0, MIT licensed. Usage: `import { init } from '@nimiq/mini-app-sdk'; const nimiq = await init()`. `init()` waits for the Nimiq provider and gives typed access. Source: https://nimiq.dev/mini-apps/
- **Nimiq Provider API** (source: https://nimiq.dev/mini-apps/api-reference/nimiq-provider):
  - `listAccounts()` → `string[]` of user-friendly addresses. Requires user confirmation. Throws `PermissionDeniedError`.
  - `sign(message)` where `message: string | { message: string, isHex?: boolean }` → `{ publicKey: string, signature: string }` (hex). Requires user confirmation. Throws `PermissionDeniedError`.
  - `isConsensusEstablished()` → `boolean`. No confirmation needed.
  - `getBlockNumber()` → `number`. No confirmation needed.
  - `sendBasicTransaction({ recipient, value, fee?, validityStartHeight? })` → `string` tx hash. Requires confirmation. `value` is in Luna (integer).
  - `sendBasicTransactionWithData({ recipient, value, data, fee?, validityStartHeight? })` → `string` tx hash. Requires confirmation. Example in docs uses a plain string for `data` (e.g. `'mic check'`) — **not** shown hex-encoded, so plain short ASCII reference strings appear supported. Exact byte-size limit is NOT documented — treat as UNKNOWN until tested against a real send (Spike S3).
  - Staking methods exist (`sendNewStakerTransaction`, etc.) — irrelevant to NimCare, not used.
  - **`getTransactionByHash` / `getTransactionsByAddress` are NOT part of the Mini App Provider API** — they are Nimiq JSON-RPC node methods (see below), a different surface.
- **Local dev testing** (source: https://nimiq.dev/mini-apps/development/load-local-mini-app):
  - Requires Node.js 22+.
  - `npm run dev -- --host`, then open the LAN URL from Nimiq Pay's Mini Apps → Custom URL field. Phone and dev machine must share Wi-Fi.
  - Dev server over plain HTTP is **not a secure context** — `crypto.randomUUID()` and similar secure-context-only APIs may be unavailable in the phone WebView. Use `crypto.getRandomValues()` or a UUID library with a fallback.
  - **Testnet exists and is usable for demo funding**: long-press the settings button for 10 seconds in Nimiq Pay to reveal a hidden dev menu, switch to Testnet, then use "Get free NIM" to claim 110,000 Luna (1.1 NIM) per request. This resolves the "no funded wallet" operational risk for Spikes S2/S3 and for the live demo — a human with the Nimiq Pay app can self-fund a test wallet without needing us to source real NIM.
  - Testnet switch only affects Nimiq operations; EVM/dual-chain features stay on mainnet unless configured otherwise (not relevant to NimCare, no EVM usage planned).
- **Recommended stack** (source: https://nimiq.dev/mini-apps/tutorials/mini-app-tutorial): official tutorial offers Vite + (Vue|React|Svelte) + TypeScript. No pinned versions documented — use current npm-published stable majors at scaffold time and commit the lockfile.
- **JSON-RPC methods exist** for `getTransactionByHash` and `getTransactionsByAddress` (source: https://nimiq.dev/rpc/methods/get-transactions-by-address, https://nimiq.dev/rpc/methods/get-transaction-by-hash) — these run against a Nimiq **node's own RPC server**, not a documented public hosted endpoint. `getTransactionsByAddress` supports a `max` param (default 500) and `startAt` (exclusive, before-hash pagination), returns newest-first, includes reward transactions.
- **No confirmed public/hosted Nimiq RPC endpoint** was found in current docs during this research pass. `nimiq.watch` is a community block explorer (https://nimiq.watch/) but its API contract for PoS is not confirmed. Running your own RPC node (`--rpc` flag) is the documented path. **This is a real, unresolved dependency for server-side transaction verification (Spike S4)** — see PROJECT_PLAN.md Assumption Register.
- **Competition rules** (source: https://miniappscompetition.com/rules, fetched 2026-09-16):
  - Must be built on the Nimiq Pay Mini Apps Framework, integrate Nimiq Pay supporting NIM, USDT, or both.
  - Public GitHub repo, MIT License, no hardcoded secrets, must be fully functional (no prototypes).
  - Max 250-word written description; optional demo video.
  - Gambling/chance-based mechanics explicitly prohibited — reinforces the master prompt's non-goals.
  - The rules page's own dates read "August 24 – September 18, **2024**" — this is almost certainly a stale copy-paste year on the organizer's page; the user-supplied deadline of **2026-09-18 23:59 UTC** is treated as authoritative per instruction precedence, but this discrepancy should be re-checked against the live page before final submission.
  - Prize amounts confirmed: $10,000 / $5,000 / $2,000 (Gold/Silver/Bronze), matches user brief.
  - The full point-by-point scoring rubric (the 45/25/15/10/5 breakdown from the user's brief) was not independently re-confirmed on the fetched rules page — treat the weights as REASONABLE INFERENCE from the user's brief, not independently re-verified in this session.

## Spike results from reading the actual installed SDK (`node_modules/@nimiq/mini-app-sdk@0.1.0/dist/*.d.ts` and `.js`, ground truth, 2026-09-16)

This resolves several PROJECT_PLAN unknowns with certainty (from source, not docs prose):

- **`sendBasicTransactionWithData`** (Spike S3, partially resolved): confirmed signature `{ recipient: string, value: number, fee?: number, data: string, validityStartHeight?: number }` → `Promise<string | ErrorResponse>`. `data` is a plain string (not required hex). Byte-limit still unconfirmed (not in types) — keep references short.
- **`sign(message)`**: confirmed `message: string | { message: string, isHex?: boolean }` → `Promise<{ publicKey: string, signature: string } | ErrorResponse>`. Failures are returned as a resolved `ErrorResponse` object (`{ error: { type, message } }`), **not necessarily a thrown/rejected promise** — client code must check for an `error` key on every wallet-method result, not just wrap in try/catch.
- **Transaction verification (Spike S4, schema now resolved)**: the SDK ships a `TransactionInfo` type — the real shape of a transaction lookup response: `{ hash, blockNumber, timestamp, confirmations, size, relatedAddresses, from, fromType, to, toType, value, fee, senderData, recipientData, flags, validityStartHeight, proof, networkId }`. `from`/`to` are addresses, `value`/`fee` are Luna integers, `senderData`/`recipientData` presumably carry the `data` field we set (need to confirm which one holds our `NC:D:<id>` reference — likely `recipientData` since Nimiq's PoW/PoS basic-with-data transactions attach data to the recipient side, but this needs confirmation against one real transaction before relying on it).
- **RPC wire format (Known, from source)**: `RPCServer.call()` POSTs `{ id, jsonrpc: '2.0', method, params }` as JSON to the configured RPC URL and expects a response shaped `{ result: { data: <payload> }, error?: { message, data } }` — it specifically reads `response.result.data`, not `response.result` directly. Our backend's own RPC client must replicate this exact envelope (Albatross-style JSON-RPC with a `data`/`metadata` wrapper), not assume a flat `result`.
- **No default/baked-in RPC URL**: `NimiqProvider` only pre-wires the wallet methods (`listAccounts`, `sign`, `sendBasicTransaction*`) through the Nimiq Pay host adapter without needing an RPC URL. Any other JSON-RPC method (including `getTransactionByHash`) throws `"No RPC URL configured"` unless `rpcUrl`/`rpc` was passed to `init()`/the provider constructor or `setRPCUrl()` was called. **This confirms there is no hidden public default endpoint we can rely on** — `NIMIQ_RPC_URL` must be explicitly provisioned (self-run node or a documented/provided endpoint), which remains the one real, unresolved operational gap for server-side verification.
- Practical consequence for `TRD.md`: our backend can either (a) run its own tiny JSON-RPC client hitting the same wire format directly (recommended — no need to import the browser-oriented SDK server-side), or (b) reuse the SDK's exported `RPCServer` class server-side since it's plain `fetch`-based and has no browser-only dependencies besides `events` (which Node provides natively). Decision: (a), a minimal dependency-free client in `server/services/nimiqRpc.ts`, to avoid pulling a browser-targeted package into the API.

## Environment facts

- Working directory `/Users/admin/NimCare` started as an empty greenfield repo (one stray unrelated file `bitsentry_audit.db` — ignored, added to `.gitignore`, left untouched as it belongs to a different tool).
- Remote `origin` = https://github.com/Benita2001/NimCare.git (public, user-provided), had a single placeholder `README.md` commit. Local repo re-based onto it.
- Node v24.13.0 and npm 11.6.2 available locally (satisfies the documented 22+ requirement).
- No `psql` client available locally; `sqlite3` is available. No cloud database credentials confirmed in this environment.
- No confirmed physical device with Nimiq Pay installed, and no confirmed funded wallet, in this coding environment. Real on-device validation of Spikes S1/S2/S5/S6 requires human participation (see PROJECT_PLAN.md Major Blockers).

## Decisions and why

- **Persistence**: use SQLite for local/dev persistence (via `better-sqlite3`) with a schema designed to be portable to Postgres later, rather than fabricating a managed Postgres instance we don't have credentials for. Documented as a Phase 7 human action to swap in real Postgres for production.
- **Transaction verification approach**: implement verification against a configurable Nimiq RPC endpoint (`NIMIQ_RPC_URL` env var) using the documented `getTransactionByHash`/`getTransactionsByAddress` methods. If no RPC endpoint is available in a given environment, the CareDrop is kept in `PAYMENT_SUBMITTED` (never force-advanced to verified) and the UI shows an explicit "verification pending — RPC not configured" state rather than fabricating a VERIFIED result.
- **On-chain reference encoding**: use a short plain-text reference in `sendBasicTransactionWithData`'s `data` field (e.g. `NC:D:<short-id>`), matching the pattern shown in the official example (`'mic check'`). Exact byte limit unverified — keep the id short (e.g. base62, ~8-12 chars) to stay safely under any reasonable limit; do not block P0 on discovering the exact byte cap.
