# DESIGN — NimCare

> **2026-09-18 redesign**: visual system replaced per a Family.co-inspired brief (playful consumer-product energy, oversized editorial typography, spacious composition, floating illustrations) while staying unmistakably NimCare. The pre-redesign terracotta/serif system (still visible at git tag `pre-media-caredrop-pivot`) is superseded below.

## Visual direction

Joyful, intimate, playful, modern consumer product — not a crypto dashboard, not DeFi software, not a generic SaaS starter. Warm off-white background, bold rounded sans headlines, coral primary action, playful floating icon accents, generous whitespace, mobile-first.

## Tokens (implemented in `app/src/index.css`)

- Background: `#FAFAF7` light / `#171613` dark
- Surface (cards): `#FFFFFF` light / `#201F1B` dark
- Text: `#242424` light / `#F5F3EE` dark, muted `#78756E` / `#A7A296`
- Primary accent (coral): `#D9643A` light / `#E8875C` dark, soft `#FBE7DC` / `#3A2A21`
- Sky blue accent: `#57B8F5` / `#7BCBFA`, soft `#E2F3FE` / `#1E2E38` — used for the Playlist type and external-link cards
- Green accent: `#16C784` / `#3FDBA0`, soft `#DEF6EB` / `#163429` — used for the Treat type and success states
- Gold accent: `#FFC85C` / `#FFD581`, soft `#FFF3DA` / `#3A2F16` — used for the Movie type and the on-chain gift pill
- Plum/berry (secondary, used sparingly): `#6B3F52` / `#9C7186`
- Error: `#FF4C2E` / `#FF8266`
- Radii: 28px (hero cards/media), 18px (composer/review cards), 12px (inputs/pills)
- Font: **Manrope** (rounded humanist grotesk, loaded via Google Fonts, weights 500–800), matching the brief's "rounded/humanist sans with premium consumer feel" direction

Bright accent colors (sky/green/gold) are used deliberately narrowly — type-card icon backgrounds, the gift pill, external-link cards — never as full-surface UI color, so the product stays calm and controlled rather than looking like a rainbow of competing accents.

## Typography

Headline (`h1`): 38px/800 weight mobile, 48px/800 at ≥640px, tight letter-spacing (-0.02em), near-black — used for the two-line hero ("Send a moment, / not just money.") and every screen's primary message. Section titles 18px/700. Body/subtitle 17px, muted. Hints/metadata 13px muted. No monospace anywhere except the collapsed transaction-hash disclosure.

## Layout & spacing

Single-column, max-width 480px mobile / 560px at ≥640px, centered. The hero pattern (`--hero`, `.hero-decor`) puts a row of four floating icon chips above the headline, then the headline, then 1–2 lines of supporting copy — deliberately spare, matching the brief's "do not put a lot of copy underneath" instruction. No horizontal scroll at 375px width (verified in-browser).

## The floating-icon "illustration" system — and its honest scope limit

The design brief asked for a full original illustrated character system (a smiling envelope, a vinyl character, a camera, etc., in a coherent 2D flat-illustration style). **That was not built in this pass** — a bespoke SVG illustration library is a substantial, separate design effort that didn't fit the available time alongside the rest of the pivot/hardening work already shipped this session. Instead, `app/src/components/HeroDecor.tsx` implements a lighter version of the same idea: soft-colored circular chips (using the type-color palette above) each carrying a single emoji glyph, gently floating (`@keyframes float`, respects `prefers-reduced-motion`). It reads as playful and on-brand at a glance, and is honestly disclosed here as a scope tradeoff rather than presented as the originally-briefed illustration system. Upgrading to real bespoke illustrations remains open P1 work.

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

Single breakpoint target for the app shell (phone WebView, ~375–430px), with a light desktop widening (560px content width, 48px headline) verified in-browser at full desktop width for the hero — this Mini App is primarily consumed inside Nimiq Pay's mobile WebView, so mobile is the design priority, not desktop.

## Accessibility

- Status is always paired with text, never color alone.
- `prefers-reduced-motion` respected for the reveal animation, the floating hero icons, and the success pop-in.
- Buttons and inputs sized ≥46–52px for touch.
- Semantic headings (`h1`/`h2`) per screen; alerts use `role="alert"`.
- Decorative hero icons are `aria-hidden`.

## Screen inventory

Welcome (hero + connect), Home (hero + type picker + Loop list), Composer (content/recipient/amount/review per CareDrop type), Share Success, Reveal (teaser → open → media reveal → respond → Send one back), Loop (moments timeline). Settings/privacy screen deferred as a P1 polish item — `PRIVACY.md` covers the same disclosure in text form for now.
