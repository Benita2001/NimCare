# DESIGN — NimCare

## Visual direction

Warm, intimate, premium — not a crypto dashboard. Terracotta accent on a warm neutral background, generous rounded corners, restrained motion, mobile-first.

## Tokens (implemented in `app/src/index.css`)

- Background: `#FBF7F2` light / `#1C1815` dark
- Surface (cards): `#FFFFFF` light / `#241F1B` dark
- Text: `#2B2420` light / `#F4EEE6` dark, muted `#8A7F73` / `#A79A8B`
- Accent (terracotta): `#C6633B` light / `#E08657` dark, soft accent background `#F3E3D6` / `#3A2A20`
- Success: `#4B7A5A` / `#7FBE93`; Error: `#B3452F` / `#E08472`
- Radii: 20px (cards/dialogs), 14px (buttons/inputs), 10px (pills/tags)
- Font: system sans-serif stack for fast load and native feel

Both light and dark are implemented via `prefers-color-scheme`, matching the browser tool's rendered dark-mode screenshot taken during Phase 5 QA.

## Typography

Single system font family. Headline (`h1`) 28px/700, section titles 17px/600, body/prompt text 16-17px, hints/metadata 13px muted. No crypto-style monospace anywhere except the collapsed "View transaction details" hash, which is intentionally de-emphasized (11px, muted, behind a `<details>` disclosure) per PRD guidance to keep blockchain plumbing out of the emotional surface.

## Layout & spacing

Single-column, max-width 480px, centered — matches a phone WebView. 20-24px side gutters, 14px vertical rhythm between stacked elements. Buttons are full-width, 48px minimum height for comfortable touch targets. No horizontal scroll at 375px width (verified in-browser).

## Component patterns

- **Buttons**: primary (filled accent), ghost (text-only, used for back/secondary actions).
- **Cards**: pair cards, memory cards, prompt cards — consistent bordered-surface pattern with rounded corners.
- **Pills**: relationship-type selector, single-select toggle state via `option-pill-active`.
- **Status banner**: progress (soft accent bg) vs error (soft red bg) — status is never color-only; every banner also carries text copy (accessibility requirement).
- **Sealed note**: locked state uses a lock emoji + soft accent card; unlocked/reveal state uses a larger serif-scale note card with a fade-up entrance animation.

## States

Every async screen implements idle/loading/success/failure explicitly (see `PRD.md` P0.12 and `app/src/screens/*`): connect wallet, load pairs, create invite, accept invite, create/send CareDrop (form → review → sending → error), poll CareDrop status, submit response. Verified live in-browser: the "Continue with Nimiq Pay" flow outside Nimiq Pay correctly renders the ProviderUnavailable error state with a retry action rather than a blank screen or silent failure.

## Responsive behavior

Single breakpoint target (phone WebView, ~375-430px) since this is a Mini App consumed inside Nimiq Pay; verified with the browser tool's mobile preset (375×812) — no overflow, comfortable tap targets.

## Accessibility

- Status is always paired with text, never color alone.
- `prefers-reduced-motion` respected for the reveal animation and spinner.
- Buttons and inputs sized ≥44-48px for touch.
- Semantic headings (`h1`/`h2`) per screen; alerts use `role="alert"` where used for connection errors.

## Screen inventory

Welcome, Home, Create Invite, Accept Invite, Pair Home (partner header + Memory list), Create CareDrop (template/amount/note → review → sending → error), CareDrop View (sender payment-status view; recipient locked-note/response view; shared reveal view), Memory (embedded in Pair Home). Settings/privacy screen deferred as a P1 polish item — `PRIVACY.md` covers the same disclosure in text form for now (see `TASKS.md` scope note).
