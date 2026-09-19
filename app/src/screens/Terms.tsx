import { EnvelopeCharacter } from '../components/Illustrations';

/**
 * Deliberately minimal — a basic, truthful disclaimer, not a drafted legal
 * document. No fabricated guarantees; see MEMORY.md for the decision to
 * keep this lightweight during the post-submission hardening pass.
 */
export function TermsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="screen">
      <button className="btn btn-ghost btn-back" onClick={onBack}>← Back</button>
      <div className="hero-envelope" style={{ width: 56, height: 56, margin: '0 0 8px' }}>
        <EnvelopeCharacter className="hero-char" />
      </div>
      <h1>Terms</h1>
      <p className="subtitle">The basics — plain and honest.</p>

      <div className="review-card" style={{ textAlign: 'left', marginTop: 16 }}>
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>NimCare is provided as-is, with no warranty of any kind.</li>
          <li>You control your own wallet. NimCare never has access to your private keys.</li>
          <li>Blockchain transactions are irreversible — double-check the recipient and amount before sending.</li>
          <li>You're responsible for the addresses and content you submit through NimCare.</li>
          <li>Do not upload unlawful or infringing material.</li>
          <li>External Spotify/Apple Music/YouTube/movie links are third-party services NimCare doesn't control.</li>
        </ul>
      </div>

      <p className="hint" style={{ marginTop: 16 }}>
        Questions? Reach the maintainer via{' '}
        <a href="https://github.com/Benita2001/NimCare" target="_blank" rel="noreferrer">
          the GitHub repository
        </a>
        .
      </p>
    </div>
  );
}
