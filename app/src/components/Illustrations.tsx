/**
 * Original NimCare "character" illustrations — simple, hand-drawn-feeling
 * inline SVG shapes (rounded bodies, dot eyes, small limbs), not copied from
 * any reference. Intentionally simple vector work, not a full bespoke
 * illustration studio pass (see DESIGN.md for the scope note) — but a real
 * step up from plain floating emoji chips: each of these is a genuine
 * character with a face and pose, matching the brief's "vector-like,
 * friendly, soft, rounded, cheerful" direction.
 */

export function EnvelopeCharacter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <ellipse cx="100" cy="178" rx="55" ry="8" fill="currentColor" opacity="0.06" />
      <g>
        <rect x="35" y="55" width="130" height="95" rx="22" fill="var(--color-accent)" />
        <path d="M35 77 L100 118 L165 77" stroke="var(--color-accent-soft)" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="78" cy="100" r="6" fill="#241A14" />
        <circle cx="122" cy="100" r="6" fill="#241A14" />
        <path d="M85 118 Q100 128 115 118" stroke="#241A14" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* little heart badge */}
        <g transform="translate(140,45)">
          <path d="M0 8 C0 2 8 -2 12 4 C16 -2 24 2 24 8 C24 16 12 26 12 26 C12 26 0 16 0 8Z" fill="var(--color-error)" />
        </g>
        {/* arms */}
        <path d="M35 120 Q15 130 20 150" stroke="var(--color-accent)" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d="M165 120 Q185 130 180 150" stroke="var(--color-accent)" strokeWidth="10" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function MusicCharacter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <ellipse cx="100" cy="178" rx="55" ry="8" fill="currentColor" opacity="0.06" />
      <circle cx="100" cy="105" r="58" fill="#232323" />
      <circle cx="100" cy="105" r="16" fill="var(--color-gold)" />
      <circle cx="100" cy="105" r="5" fill="#232323" />
      <circle cx="85" cy="98" r="5" fill="#FAFAF7" />
      <circle cx="115" cy="98" r="5" fill="#FAFAF7" />
      <path d="M88 118 Q100 126 112 118" stroke="#FAFAF7" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* headphones */}
      <path d="M52 100 A48 48 0 0 1 148 100" stroke="var(--color-sky)" strokeWidth="10" fill="none" strokeLinecap="round" />
      <rect x="42" y="95" width="16" height="26" rx="8" fill="var(--color-sky)" />
      <rect x="142" y="95" width="16" height="26" rx="8" fill="var(--color-sky)" />
      {/* legs */}
      <path d="M85 160 L80 178" stroke="#232323" strokeWidth="8" strokeLinecap="round" />
      <path d="M115 160 L120 178" stroke="#232323" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}

export function MovieCharacter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <ellipse cx="100" cy="178" rx="55" ry="8" fill="currentColor" opacity="0.06" />
      <path d="M62 90 L70 165 L130 165 L138 90 Z" fill="var(--color-error)" />
      <path d="M62 90 L138 90 L133 70 L67 70 Z" fill="#FFFFFF" />
      <rect x="67" y="70" width="66" height="20" fill="var(--color-error)" opacity="0.15" />
      <circle cx="86" cy="120" r="5" fill="#241A14" />
      <circle cx="114" cy="120" r="5" fill="#241A14" />
      <path d="M88 135 Q100 143 112 135" stroke="#241A14" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M62 90 Q100 100 138 90" stroke="#FFFFFF" strokeWidth="3" fill="none" opacity="0.6" />
      <path d="M60 90 L50 170" stroke="#241A14" strokeWidth="7" strokeLinecap="round" opacity="0" />
    </svg>
  );
}

export function Sparkle({ className, color = 'var(--color-gold)' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill={color} />
    </svg>
  );
}

export function HeartAccent({ className, color = 'var(--color-error)' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 21s-7.5-4.6-10-9.3C0.3 8 2.3 4 6.3 4c2 0 3.7 1.1 4.7 2.8C12 5.1 13.7 4 15.7 4c4 0 6 4 4.3 7.7C19.5 16.4 12 21 12 21z" fill={color} />
    </svg>
  );
}
