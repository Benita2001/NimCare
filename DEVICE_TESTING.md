# DEVICE_TESTING — NimCare Two-Phone Protocol

This document is the reproducible script for testing the Critical Demo Path on real hardware inside Nimiq Pay. It has **not yet been run** as of this writing (2026-09-18) — this coding environment has no physical device with Nimiq Pay installed. Everything below is written so a human can execute it directly and fill in the PASS/FAIL column truthfully.

## Prerequisites

- Two phones, each with Nimiq Pay installed.
- Nimiq Pay's hidden dev menu (long-press the settings button for 10 seconds) → switch to **Testnet** → use "Get free NIM" to claim 110,000 Luna (1.1 NIM) per request, on both devices. (Verified documented in Nimiq's own mini-app dev docs — see `MEMORY.md`.)
- **Important caveat**: the production RPC this build uses (`https://rpc.nimiqwatch.com`) was verified reachable and returning **mainnet** data during this hardening pass (`networkId: 24`). Whether it also serves testnet data, or whether a different endpoint is needed for testnet, was **not verified** in this pass — check `NIMIQ_RPC_URL` / `NIMIQ_NETWORK_ID` behavior against whichever network you actually fund before trusting a PASS on payment verification. If testnet verification doesn't work end-to-end with the configured RPC, either find a testnet-capable RPC endpoint or use a very small mainnet amount with explicit human approval, per the hardening instructions — do not silently mix networks.
- The deployed app: `https://nimcare-app.vercel.app` (frontend), backed by `https://nimcare-api.vercel.app` (API). Open the frontend URL inside Nimiq Pay on both devices (Nimiq Pay → Mini Apps → Custom URL, or a "Load a Local Mini App"-style flow if testing a dev build instead).

## Protocol

| # | Device | Step | Expected | Result |
| - | ------ | ---- | -------- | ------ |
| 1 | A | Open NimCare inside Nimiq Pay | App loads, shows Welcome screen | UNTESTED |
| 2 | A | Tap "Continue with Nimiq Pay" | `listAccounts()` grants access, real address shown shortened | UNTESTED |
| 3 | A | Wallet signs the login challenge | Session established (real signature verified server-side — see `TRD.md`) | UNTESTED |
| 4 | A | Create a Partner/Friend Loop | Invite created, link + short code shown | UNTESTED |
| 5 | A | Share invite (tap "Open in Nimiq Pay" link or send the short code) | Recipient can open it | UNTESTED |
| 6 | B | Open invite inside Nimiq Pay | Sees who invited them and the relationship type | UNTESTED |
| 7 | B | Authenticate (connect wallet, sign challenge) | Session established | UNTESTED |
| 8 | B | Accept Loop | Pair status becomes ACCEPTED on both devices | UNTESTED |
| 9 | A | Create CareDrop: "Coffee on me" | Review screen shows recipient, amount, prompt | UNTESTED |
| 10 | A | Choose a tiny amount (e.g. 0.1 NIM) | — | UNTESTED |
| 11 | A | Add a sealed note | — | UNTESTED |
| 12 | A | Approve the real wallet transaction | Nimiq Pay's native approval UI appears | UNTESTED |
| 13 | A | Get transaction hash | App shows "Broadcasting…" then "Verifying…" | UNTESTED |
| — | Server | Detect transaction via RPC | `blockchainVerificationStatus` moves off `PENDING` | UNTESTED |
| — | Server | Verify unique hash | A reused hash is rejected (already proven in automated tests, not device-specific) | PASS (automated, see `server/src/integration.test.ts`) |
| — | Server | Verify sender | Mismatch correctly rejected (automated) | PASS (automated) |
| — | Server | Verify recipient | Mismatch correctly rejected (automated) | PASS (automated) |
| — | Server | Verify amount | Mismatch correctly rejected (automated) | PASS (automated) |
| — | Server | Verify CareDrop data reference | Mismatch correctly rejected (automated); real recipientData hex-decoding confirmed against a live mainnet transaction (see `MEMORY.md`) | PASS (automated + live RPC evidence) |
| 14 | Server | Mark delivered | CareDrop reaches `DELIVERED` once genuinely verified | UNTESTED (device) |
| 15 | B | See the CareDrop | Amount + prompt visible, note shown LOCKED | UNTESTED |
| 16 | B | (Gift already belongs to B) | No "claim" step required — B already has the funds per the wallet transaction itself | UNTESTED |
| 17 | B | Respond | Response text submitted | UNTESTED |
| 18 | Server | Verify completion | CareDrop → `COMPLETED` | UNTESTED |
| 19 | B | Note reveals | Sealed note becomes visible | UNTESTED |
| 20 | A + B | Completed CareDrop appears in Memory | Both wallets see it in their shared timeline | UNTESTED |

## Additional required checks

| Scenario | Expected | Result |
| -------- | -------- | ------ |
| Reject wallet login (deny permission) | Specific "wallet access declined" state, retry available | UNTESTED (device); the equivalent client-side error path (`PermissionDenied`) is implemented, see `app/src/nimiq/provider.ts` |
| Reject transaction (cancel approval) | CareDrop stays un-funded with a clear error, not silently "sent" | UNTESTED (device); implemented client-side error path exists |
| Invalid invite | "This invite link is not valid" | PASS (automated — `invite_not_found`, see integration tests) |
| Reused invite | "This invite has already been used" | PASS (automated — `invite_already_used`) |
| Backend unavailable | UI shows a specific error, not a blank screen | Implemented (`BackendError` state in `session.tsx`); not device-tested against a real outage |
| RPC unavailable | CareDrop stays "verification pending," never fabricated as verified | PASS (automated, and confirmed live in production before `NIMIQ_RPC_URL` was set — see `MEMORY.md`) |
| Transaction mismatch (wrong sender/recipient/amount/reference) | CareDrop marked `FAILED` with a specific reason | PASS (automated, 4 distinct mismatch scenarios) |
| Reload during pending transaction | Status resumes correctly on reload (server is the source of truth, not client state) | Implemented by design (client polls server state); not device-tested |
| Opening invitation outside Nimiq Pay | Shows the "Open NimCare in Nimiq Pay" conversion screen with a real deeplink, not a bare error | Implemented (`Welcome.tsx` ProviderUnavailable branch); browser-verified in a plain (non-Nimiq-Pay) browser during this session, see `MEMORY.md` — full on-device deeplink tap-through not yet tested |

## Reset / re-run procedure

Each CareDrop and Pair is a fresh row in the production Postgres database — there is no dedicated "reset" endpoint. To re-run the full protocol cleanly:

1. Generate a fresh wallet pair (or use a different relationship-type Loop) rather than reusing an already-`ACCEPTED` pair, since a pair can only be accepted once.
2. Each CareDrop transaction hash must be unique (enforced by the database) — a real wallet transaction naturally produces a new hash each time, so this isn't a practical concern in real device testing.
3. No manual cleanup is required between runs; old test data simply accumulates as additional (harmless) rows.

## How to fill this in

Replace `UNTESTED` with `PASS` or `FAIL` only after actually performing that exact step on a real device. If a step fails, record the exact error text/screen and the device/OS/Nimiq Pay version, and file it as a blocker rather than silently marking the row PASS.
