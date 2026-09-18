# Privacy — NimCare

NimCare is built to collect the minimum needed to make CareDrops work between two people who already know each other.

## What NimCare stores

- **Your wallet address** — used as your identity in NimCare. No email, phone number, or password is ever collected.
- **Your public key** — captured during wallet-session verification, used only to verify future signatures from you.
- **Loop records** — the two wallet addresses exchanging CareDrops, formed automatically the first time you send or receive one (no separate "accept" step to consent to first).
- **CareDrop records** — sender/recipient wallet, type (photo/playlist/movie/treat), title/caption, a link to any uploaded photo, any external link (e.g. a Spotify/YouTube URL) you attach, amount (in Luna), status, and the on-chain transaction hash once submitted.
- **Uploaded photos** — stored in Vercel Blob object storage as **public, unguessable URLs** (not database blobs). Anyone who obtains the exact URL could view the image directly — the URL itself is the access control, the same model as most link-based photo/file sharing. It is not indexed or discoverable, and it is not additionally access-checked by NimCare's backend once you have the URL.
- **CareDrop responses** — the text you write back, and (where implemented) a completion signature.
- **Share tokens** — a high-entropy token per CareDrop used to build its shareable link. Only its SHA-256 hash is stored, and the CareDrop's actual content (caption, media, amount) is only returned to a wallet-authenticated request whose address matches the CareDrop's designated recipient — knowing the link alone is not sufficient to read a CareDrop's content, only to attempt to open it.

## Why it's stored

Purely to run the product: to know which two wallets share a Loop, to hold a CareDrop's state through its lifecycle, and to reveal its media/caption only to the wallet-authenticated recipient once the payment has been genuinely verified — never to anyone else, and never before real verification.

## About share links

Anyone with a CareDrop's private share link can attempt to open it, but its actual content (caption, photo, amount) is only served to a wallet-authenticated request whose address matches the CareDrop's designated recipient — a stranger who finds or guesses a link gets a clean "not the recipient" response, not the content. The uploaded photo itself, once its Blob URL is known, is not further access-checked (see above) — treat an uploaded photo's URL as similarly shareable to the link itself.

## What goes on the Nimiq blockchain

Only a short, non-private reference string (e.g. `NC:D:<id>`) attached to the NIM transaction itself, plus whatever any Nimiq transaction inherently reveals on a public blockchain: sender address, recipient address, amount, and timestamp. Nimiq is a public blockchain — this is the same transparency any NIM transfer has, with or without NimCare.

## What never goes on-chain

Your CareDrop's title, caption, uploaded photo, and your response text are **never** written to the blockchain. They live only in NimCare's database (and Vercel Blob storage for photos).

## What is not collected

No private keys, no seed phrases, no contacts, no precise location, no device fingerprinting beyond what the Nimiq Pay host itself may provide (NimCare does not call `requestDeviceIdentifier`), and no third-party analytics or advertising trackers in this build.

## Accuracy of claims

NimCare does **not** claim end-to-end encryption. Sealed notes are access-controlled (only revealed to the intended recipient's session, only after completion) but are stored in plain form in the application database, not encrypted at rest in this build. If that changes, this document will be updated to reflect it accurately.

## Data retention & deletion

Pair, CareDrop, and response records are retained indefinitely by default since they form your shared Memory. There is currently no self-service deletion flow (P1/P2). To request deletion of your data, contact the maintainer via the GitHub repository: https://github.com/Benita2001/NimCare.

## Third parties

- **Vercel Blob** stores any photo you upload to a CareDrop (see above).
- **Nimiq RPC** (a configured Nimiq node's JSON-RPC endpoint) is queried to verify transactions — only a transaction hash lookup, never your caption, photo, or response content.
- If you attach a Spotify/Apple Music/YouTube link, NimCare stores and displays that URL and opens it in the respective service when tapped — NimCare does not fetch, proxy, or store any content from those services itself.
No analytics or advertising trackers are used in this build.
