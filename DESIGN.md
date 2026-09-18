# DESIGN — NimCare

> **2026-09-18 redesign (round 4 — current)**: refined the hero composition without redesigning it. The envelope mascot is unchanged in size (148×148px) and position (top-center, above the headline, `.hero-envelope`) at every breakpoint — it was never moved into the side clusters. Instead, the desktop side clusters (`.hero-cluster-left`/`-right`) gained genuinely different supporting objects — a polaroid-stack illustration (`PolaroidStack`) and a ticket+popcorn illustration (`TicketPopcorn`), both new — plus soft blurred pastel "blob" shapes (`Blob`) behind them for a fuller, more art-directed feel, alongside the existing music/movie characters and sparkle/heart accents. The three "CareDrops" feature cards were upgraded from a plain icon-badge-plus-text block to an illustrated mini-poster layout: each card's matching illustration (polaroid stack / headphone character / ticket+popcorn) sits large in the bottom-right corner behind the text (collapsing to a smaller inline illustration below the text under 380px, so nothing overlaps or overflows).

> **Round 3 notes (still current)**: corrected two things round 2 got wrong per direct feedback. (1) **Light theme is now forced, not system-dependent.** Round 2 still had a `prefers-color-scheme: dark` variant, and a viewer whose OS/browser was in dark mode saw a dark NimCare — read as "the redesign went dark," which was never the intent. The dark media query is deleted; `:root` sets `color-scheme: light` and `index.html` sets `<meta name="color-scheme" content="light">`, so the app renders identically regardless of system theme. Verified live with the browser emulator forced to `colorScheme: dark` — the app stayed light. (2) **No emoji anywhere in the UI.** Every emoji glyph (🎁📸🎵🍿💌 etc.) used as a functional icon is replaced with a small inline-SVG icon component (`PhotoIcon`, `MusicIcon`, `MovieIcon`, `GiftIcon`, `SendIcon` in `Illustrations.tsx`) or the envelope character. The hero also dropped the "See how it works" secondary button per feedback — one primary CTA ("Send a CareDrop") only, mirrored as a pill button in the nav next to "Sign in" (hidden below 480px to avoid nav crowding, since it's a redundant action pre-auth). Round 2's two-sided character hero, feature cards, and mobile-collapse behavior are otherwise unchanged — see below.

## Visual direction

Joyful, intimate, playful, modern consumer product — not a crypto dashboard, not DeFi software, not a generic SaaS starter. Warm off-white background, bold rounded sans headlines, coral primary action, playful floating icon accents, generous whitespace, mobile-first.

## Tokens (implemented in `app/src/index.css`) — single light theme, no dark variant

- Background: `#FAFAF7`
- Surface (cards): `#FFFFFF`
- Text: `#242424`, muted `#78756E`
- Primary accent (coral): `#D9643A`, soft `#FBE7DC`
- Sky blue accent: `#57B8F5`, soft `#E2F3FE` — used for the Playlist type and external-link cards
- Green accent: `#16C784`, soft `#DEF6EB` — used for the Treat type and success states
- Gold accent: `#FFC85C`, soft `#FFF3DA` — used for the Movie type and the on-chain gift pill
- Plum/berry (secondary, used sparingly): `#6B3F52`
- Error: `#FF4C2E`
- Radii: 28px (hero cards/media), 18px (composer/review cards), 12px (inputs/pills)
- Font: **Manrope** (rounded humanist grotesk, loaded via Google Fonts, weights 500–800), matching the brief's "rounded/humanist sans with premium consumer feel" direction

Bright accent colors (sky/green/gold) are used deliberately narrowly — type-card icon backgrounds, the gift pill, external-link cards — never as full-surface UI color, so the product stays calm and controlled rather than looking like a rainbow of competing accents.

## Typography

Headline (`h1`): 38px/800 weight mobile, 48px/800 at ≥640px, tight letter-spacing (-0.02em), near-black — used for the two-line hero ("Send a moment, / not just money.") and every screen's primary message. Section titles 18px/700. Body/subtitle 17px, muted. Hints/metadata 13px muted. No monospace anywhere except the collapsed transaction-hash disclosure.

## Layout & spacing

Single-column, max-width 480px mobile / 560px at ≥640px, centered. The hero pattern (`--hero`, `.hero-decor`) puts a row of four floating icon chips above the headline, then the headline, then 1–2 lines of supporting copy — deliberately spare, matching the brief's "do not put a lot of copy underneath" instruction. No horizontal scroll at 375px width (verified in-browser).

## The illustration system (round 2) — and its honest scope limit

`app/src/components/Illustrations.tsx` now has three real original inline-SVG characters — a rounded envelope with a face, arms and a small heart badge (the primary NimCare brand object); a vinyl-record character wearing headphones; and a popcorn-tub character — plus small sparkle/heart accent glyphs. They're composed into a genuine two-sided hero (`.hero-cluster-left` / `.hero-cluster-right`, positioned via CSS Grid at the ≥900px breakpoint) that collapses to one character above the headline on mobile (`.hero-mobile-char`), matching the brief's "one strong hero illustration, not scattered floating icons" direction.

**Still an honest scope limit, not silently resolved**: these are simple flat-shape vector drawings (circles, rounded rects, basic paths), not a full illustrated-character studio pass with painted textures, varied poses per screen, or a complete motif library (the brief also suggested a photo card, gift box, coin, speech bubble, tape/scrapbook accents — not all built). What exists is real, original, and reads as "a character with a face," which is a genuine step up from generic emoji chips — but it is not the full bespoke illustration system a dedicated designer would produce. Expanding the motif set and adding per-screen variety remains open P1 work.

## Component patterns

- **Buttons**: full pill shape (`border-radius: 999px`), 52px min height. Primary = filled coral. Ghost = bordered surface, used for back/secondary actions.
- **Type cards** (`.type-card`): the CareDrop picker on Home — large tappable rows with a colored icon badge (one color per type: coral/sky/gold/green) + bold title, replacing the old plain bordered list.
- **Loop cards / moment cards**: bordered-surface rows, consistent radius, used for both the Loop list and the moments timeline.
- **Composer steps**: content → recipient → amount → review, with a 3-dot progress indicator (`.step-dots`) rather than a flat form.
- **Success/teaser icon** (`.success-icon`): an 84px soft-coral circle with a pop-in entrance, used both for "Your CareDrop is ready" (sender) and "A CareDrop found you" (recipient teaser).
- **Reveal card**: photo-first, full-bleed image atop a rounded card body containing the headline, caption, external-link card (sky-tinted) for Playlist/Movie, and the on-chain gift as a gold pill ("🎁 1 NIM"), not a raw Luna figure — blockchain detail is demoted to a collapsed "View transaction details" disclosure.

## States

Every async screen implements idle/loading/success/failure explicitly: connect wallet, load Loops, upload photo, create/send CareDrop (content → recipient → amount → review → sending → error), poll CareDrop status, submit response. The outside-Nimiq-Pay conversion screen and the stranger-blocked share-link state were both live-verified in-browser/in-production this session.

## Responsive behavior

Mobile is the design priority (this is a Mini App consumed inside Nimiq Pay's phone WebView), with a genuine desktop composition layered on top for browser/marketing viewing, not the other way around:

- **< 640px (primary target)**: single-column `.screen`, 480px max-width, 20px gutters. Hero collapses to one character above the headline (`.hero-mobile-char`, 148×148px) — no side clusters. Verified with zero horizontal overflow at 320px, 375px, 390px in both light and dark color schemes.
- **640–899px**: `.screen` widens to 560px, headline scales to 48px; hero clusters still hidden (not enough room for a real three-column composition without cramming).
- **≥ 900px (`.screen-wide`, Welcome/Home only)**: full three-part hero grid (left character cluster / headline+CTA column / right character cluster), verified at 1280px.
- **Inputs**: 16px minimum font size (`.input`) specifically to avoid iOS Safari's auto-zoom-on-focus behavior, which would otherwise break the composer's amount/caption fields.
- **Safe areas**: `.screen` padding uses `env(safe-area-inset-top/bottom)` (`viewport-fit=cover` set in `index.html`) so content and buttons don't collide with a notch or home indicator on supporting devices. No dedicated sticky bottom action bar was built this pass — every screen's primary CTA is the last flex child in a scrollable column instead, which is simpler and avoids keyboard-overlap bugs, at the cost of the CTA not always being pinned to the bottom edge.
- **Touch targets**: buttons ≥52px tall, pills ≥46px, all comfortably above the 44×44px accessibility minimum.
- Functional in-flow screens (Composer, Reveal, Loop, Share Success) deliberately stay single-column/narrow at every width — the wide three-column treatment is reserved for the two "arrival" screens (Welcome, Home) where there's real marketing-style content to compose with, not for task-focused flows.

## Accessibility

- Status is always paired with text, never color alone.
- `prefers-reduced-motion` respected for the reveal animation, the floating hero icons, and the success pop-in.
- Buttons and inputs sized ≥46–52px for touch.
- Semantic headings (`h1`/`h2`) per screen; alerts use `role="alert"`.
- Decorative hero icons are `aria-hidden`.

## Screen inventory

Welcome (hero + connect), Home (hero + type picker + Loop list), Composer (content/recipient/amount/review per CareDrop type), Share Success, Reveal (teaser → open → media reveal → respond → Send one back), Loop (moments timeline). Settings/privacy screen deferred as a P1 polish item — `PRIVACY.md` covers the same disclosure in text form for now.
