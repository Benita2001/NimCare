# Privacy — NimCare

NimCare is built to collect the minimum needed to make CareDrops work between two people who already know each other.

## What NimCare stores

- **Your wallet address** — used as your identity in NimCare. No email, phone number, or password is ever collected.
- **Your public key** — captured during wallet-session verification, used only to verify future signatures from you.
- **An optional display name** — if you choose to set one (P1, not yet built).
- **Pair records** — the two wallet addresses in a Loop, its relationship type (Partner/Friend/Family), and status.
- **CareDrop records** — sender/recipient wallet, prompt text, amount (in Luna), the sealed private note, status, and the on-chain transaction hash once submitted.
- **CareDrop responses** — the text you write back, and (where implemented) a completion signature.

## Why it's stored

Purely to run the product: to know who is paired with whom, to hold a CareDrop's state through its lifecycle, and to reveal a sealed note only once it's been legitimately unlocked by both required actions (payment + response).

## What goes on the Nimiq blockchain

Only a short, non-private reference string (e.g. `NC:D:<id>`) attached to the NIM transaction itself, plus whatever any Nimiq transaction inherently reveals on a public blockchain: sender address, recipient address, amount, and timestamp. Nimiq is a public blockchain — this is the same transparency any NIM transfer has, with or without NimCare.

## What never goes on-chain

Your prompt text, your private sealed note, and your response text are **never** written to the blockchain. They live only in NimCare's database.

## What is not collected

No private keys, no seed phrases, no contacts, no precise location, no device fingerprinting beyond what the Nimiq Pay host itself may provide (NimCare does not call `requestDeviceIdentifier`), and no third-party analytics or advertising trackers in this build.

## Accuracy of claims

NimCare does **not** claim end-to-end encryption. Sealed notes are access-controlled (only revealed to the intended recipient's session, only after completion) but are stored in plain form in the application database, not encrypted at rest in this build. If that changes, this document will be updated to reflect it accurately.

## Data retention & deletion

Pair, CareDrop, and response records are retained indefinitely by default since they form your shared Memory. There is currently no self-service deletion flow (P1/P2). To request deletion of your data, contact the maintainer via the GitHub repository: https://github.com/Benita2001/NimCare.

## Third parties

None are used to process your relationship content in this build. The only outbound network calls NimCare's backend makes are to a configured Nimiq RPC endpoint (to verify transactions) — no data about your prompts, notes, or responses is sent there, only a transaction hash lookup.
