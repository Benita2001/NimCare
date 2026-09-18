# DEVICE_TESTING — NimCare Two-Phone Protocol (current product)

This document is the reproducible script for testing the **current** surprise-first media CareDrop flow on real hardware inside Nimiq Pay. It replaces an earlier version of this document that described the pre-pivot invite/accept flow, which is no longer part of the primary UX.

**Nothing in this document has been run on a physical device as of this writing (2026-09-18).** This coding environment has no physical device with Nimiq Pay installed. Every row below is `UNTESTED` by design — automated tests and live-production API smoke tests (see `MEMORY.md`) prove the server-side logic works, but they are **not** a substitute for an actual on-device run and must never be used to mark a row here `PASS`. Only mark a row `PASS` after physically performing that exact step; `FAIL` if it doesn't work as described, `UNTESTED` until then.

## Prerequisites

- Two phones, each with Nimiq Pay installed.
- Nimiq Pay's hidden dev menu (long-press the settings button for 10 seconds) → switch to **Testnet** → "Get free NIM" (110,000 Luna / 1.1 NIM per request) on both devices. (Documented in Nimiq's own mini-app dev docs — see `MEMORY.md`.)
- **Network caveat**: the production RPC this build uses (`https://rpc.nimiqwatch.com`) was verified reachable and returning **mainnet** data during hardening (`networkId: 24`). Whether it also serves testnet data is unconfirmed. If a testnet payment doesn't verify, either find a testnet-capable RPC endpoint and reconfigure `NIMIQ_RPC_URL`, or use a very small mainnet amount with explicit human approval. Never let a testnet wallet's transaction be checked against a mainnet-only RPC and call it verified — if the network doesn't match, the correct outcome is the CareDrop staying pending, not a false PASS.
- The deployed app: `https://nimcare-app.vercel.app` (frontend), backed by `https://nimcare-api.vercel.app` (API). Open the frontend URL inside Nimiq Pay on both devices (Nimiq Pay → Mini Apps → Custom URL).

## Main protocol

### Device A (sender)

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | Open NimCare in Nimiq Pay | Hero loads: "Send a moment, not just money," single "Send a CareDrop" CTA, envelope mascot, light theme | UNTESTED |
| 2 | Tap "Send a CareDrop" / connect wallet | `listAccounts()` grants access, real address obtained | UNTESTED |
| 3 | Complete real signed authentication | Wallet signs the nonce challenge; session established via genuine `@nimiq/core` signature verification (not merely a claimed address) | UNTESTED |
| 4 | Land on Home / tap "Send a CareDrop" again if needed | Type picker shown: Photo / Playlist / Movie / Treat, no relationship-type question anywhere | UNTESTED |
| 5 | Choose Photo CareDrop | Composer opens on the content step | UNTESTED |
| 6 | Upload one real image | Upload succeeds, preview shown, image persisted to real storage (Vercel Blob) | UNTESTED |
| 7 | Enter recipient wallet (Device B's address) | Accepted if a valid Nimiq address; no "create Loop" or pairing step required first | UNTESTED |
| 8 | Attach a tiny NIM amount | Amount preset or custom entry accepted, converted correctly to Luna | UNTESTED |
| 9 | Review | Review screen shows recipient, amount, content correctly before approval | UNTESTED |
| 10 | Approve real Nimiq Pay transaction | Native Nimiq Pay approval UI appears and completes | UNTESTED |
| 11 | Confirm app receives tx hash | App shows "Broadcasting…" then a real hash, not stuck on a spinner indefinitely | UNTESTED |
| 12 | Confirm backend changes payment from pending to verified/delivered | Status banner moves off "Waiting/Broadcasting" to a delivered state once the chain confirms (or, if RPC/network mismatch, stays honestly "verification pending" rather than falsely flipping to delivered) | UNTESTED |
| 13 | Confirm share link is generated | Share Success screen appears with a real link and a working "Share" / "Copy link" action | UNTESTED |

### Device B (recipient)

| # | Step | Expected | Result |
|---|------|----------|--------|
| 14 | Open the CareDrop share link | Link opens (directly in Nimiq Pay, or via a browser first) | UNTESTED |
| 15 | Open inside Nimiq Pay if needed | If opened outside Nimiq Pay, a real "Open NimCare in Nimiq Pay" conversion screen appears — not a bare error | UNTESTED |
| 16 | Connect wallet | `listAccounts()` grants access | UNTESTED |
| 17 | Complete signed authentication | Same real signature flow as Device A | UNTESTED |
| 18 | (Adversarial) A **wrong** wallet attempts to open the same link | Server returns 403/`not_the_recipient` — confirmed automated + live-API evidence exists (see `MEMORY.md`); still UNTESTED on-device | UNTESTED |
| 19 | Intended recipient (Device B) opens the link | Teaser screen: "A CareDrop found you" | UNTESTED |
| 20 | Tap "Open surprise" | Reveal screen loads | UNTESTED |
| 21 | Confirm photo loads | The uploaded image renders correctly, no broken image icon | UNTESTED |
| 22 | Confirm amount and CareDrop details are correct | Displayed amount/title/caption match what Device A sent | UNTESTED |
| 23 | Confirm NIM was actually received by B's wallet | Check B's Nimiq Pay wallet balance directly — the gift is a real transaction, not just a UI claim | UNTESTED |
| 24 | Submit response | Response text field accepts input and submits | UNTESTED |
| 25 | Confirm CareDrop becomes completed | Status updates to completed for both viewers | UNTESTED |
| 26 | Confirm "Send one back" works | Tapping it opens the Composer with Device A pre-filled as recipient | UNTESTED |
| 27 | Confirm Loop appears automatically with no relationship-acceptance step | "Your Loops" shows A↔B with no Partner/Friend/Family prompt ever having appeared | UNTESTED |

### Device A + B (both)

| # | Step | Expected | Result |
|---|------|----------|--------|
| 28 | Confirm completed CareDrop appears in Loop/history for both wallets | Both A and B see the same moment in their respective Loop view | UNTESTED |
| 29 | Reload both apps and confirm state persists | No state loss on refresh — server remains source of truth, not local/session state | UNTESTED |

## Additional required scenarios

| Scenario | Expected | Result |
|----------|----------|--------|
| User denies wallet access | Specific "wallet access declined" state with a retry action, not a blank screen | UNTESTED |
| User cancels payment approval | CareDrop stays un-funded with a clear error and retry path, never silently marked "sent" | UNTESTED |
| Insufficient funds | Nimiq Pay's own insufficient-balance handling surfaces; NimCare does not claim success | UNTESTED |
| Wrong wallet opens share link | 403 `not_the_recipient`, no content leak — same as protocol step 18 | UNTESTED |
| Invalid/garbage share token | 404 `caredrop_not_found`, not a crash or blank screen | UNTESTED |
| Backend unavailable | Frontend shows a specific "could not reach server" state (`BackendError`), not an infinite spinner | UNTESTED |
| RPC unavailable / verification pending | CareDrop stays honestly "verification pending" — confirmed via automated tests and live production smoke tests (see `MEMORY.md`); still worth an on-device look to confirm the UI copy reads sensibly | UNTESTED |
| Reload while transaction is pending | On reload, the app re-polls server state and picks up wherever the CareDrop actually is, not stuck or reset | UNTESTED |
| Link opened outside Nimiq Pay | Real "Open in Nimiq Pay" conversion screen, with a working deeplink attempt and a manual fallback | UNTESTED |
| Mobile layout at real device width | No horizontal overflow, comfortable touch targets, envelope mascot and hero render correctly — desktop-browser emulation at 320–430px already checked in-browser (see `MEMORY.md`), but a real device's rendering engine, safe areas, and on-screen keyboard behavior are genuinely different and untested | UNTESTED |
| Upload and keyboard behavior | Photo picker opens correctly from the WebView; text inputs (caption, amount, response) don't trigger unwanted zoom and remain visible above the keyboard | UNTESTED |

## Reset / re-run procedure

Each CareDrop and Loop is a fresh row in the production Postgres database — there is no dedicated "reset" endpoint. To re-run the full protocol cleanly:

1. Use a fresh wallet pair, or send a new CareDrop type to an existing Loop (a Loop, once formed, persists — that's intended behavior, not something to reset).
2. Each transaction hash must be unique (DB-enforced) — a real wallet transaction naturally produces a new hash every time, so this is not a practical concern on a real device.
3. No manual cleanup is required between runs; old test data simply accumulates as additional (harmless) rows.

## How to fill this in

Replace `UNTESTED` with `PASS` or `FAIL` only after physically performing that exact step on a real device with the real Nimiq Pay app. If a step fails, record the exact error text/screen, device model, OS version, and Nimiq Pay version, and file it as a blocker in `TASKS.md` (NIM-026) rather than silently marking the row PASS.
