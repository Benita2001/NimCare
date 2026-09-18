/**
 * Original, lightweight NimCare "floating illustration" motif — CSS-driven
 * colored circles carrying an emoji glyph, not a bespoke SVG character
 * system. A full illustration library (per the design brief's suggested
 * envelope/vinyl/camera characters) was out of scope for the time
 * available in this pass; this is the honest, disclosed tradeoff — see
 * DESIGN.md.
 */
export function HeroDecor() {
  return (
    <div className="hero-decor" aria-hidden="true">
      <div className="floaty floaty-1">💌</div>
      <div className="floaty floaty-2">🎵</div>
      <div className="floaty floaty-3">🍿</div>
      <div className="floaty floaty-4">✨</div>
    </div>
  );
}
