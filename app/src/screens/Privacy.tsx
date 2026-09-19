import { EnvelopeCharacter } from '../components/Illustrations';

/**
 * In-app summary of PRIVACY.md, so a user (or judge) doesn't have to visit
 * GitHub to understand what NimCare stores. Kept in sync with PRIVACY.md's
 * actual claims — do not add anything here that PRIVACY.md doesn't also
 * say, and update both together if the product's data handling changes.
 */
export function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="screen">
      <button className="btn btn-ghost btn-back" onClick={onBack}>← Back</button>
      <div className="hero-envelope" style={{ width: 56, height: 56, margin: '0 0 8px' }}>
        <EnvelopeCharacter className="hero-char" />
      </div>
      <h1>Privacy</h1>
      <p className="subtitle">What NimCare stores, and why — in plain language.</p>

      <div className="review-card" style={{ textAlign: 'left', marginTop: 16 }}>
        <p><strong>Your identity</strong></p>
        <p className="hint">Your wallet address is your identity in NimCare. No email, phone number, or password is ever collected.</p>

        <p style={{ marginTop: 14 }}><strong>What's stored</strong></p>
        <p className="hint">
          Your wallet address and public key; who you've exchanged CareDrops with (a "Loop"); each CareDrop's type, title,
          caption, any uploaded photo or external link, its NIM amount, and its on-chain transaction hash once submitted;
          and any response text you write back.
        </p>

        <p style={{ marginTop: 14 }}><strong>Photo storage</strong></p>
        <p className="hint">
          Uploaded photos are stored as public, unguessable URLs (Vercel Blob) — not access-checked further once the URL is
          known, the same model as most link-based photo sharing. Treat a photo's URL as shareable as the CareDrop link itself.
        </p>

        <p style={{ marginTop: 14 }}><strong>On the blockchain</strong></p>
        <p className="hint">
          Only a short, non-private reference string, plus whatever any Nimiq transaction inherently reveals on a public
          blockchain: sender, recipient, amount, and timestamp. This is the same transparency any NIM transfer has, with or
          without NimCare.
        </p>

        <p style={{ marginTop: 14 }}><strong>What stays off-chain</strong></p>
        <p className="hint">
          Your CareDrop's title, caption, uploaded photo, and your response text are never written to the blockchain — they
          live only in NimCare's database and Vercel Blob storage.
        </p>

        <p style={{ marginTop: 14 }}><strong>What's never collected</strong></p>
        <p className="hint">
          No private keys, no seed phrases, no contacts, no precise location, no device fingerprinting, and no third-party
          analytics or advertising trackers in this build.
        </p>

        <p style={{ marginTop: 14 }}><strong>Deletion &amp; contact</strong></p>
        <p className="hint">
          There is currently no self-service deletion flow. To request deletion of your data, contact the maintainer via{' '}
          <a href="https://github.com/Benita2001/NimCare" target="_blank" rel="noreferrer">
            the GitHub repository
          </a>
          .
        </p>
      </div>

      <p className="hint" style={{ marginTop: 16 }}>
        This is a summary. The full, detailed policy is always the source of truth:{' '}
        <a
          href="https://github.com/Benita2001/NimCare/blob/main/PRIVACY.md"
          target="_blank"
          rel="noreferrer"
        >
          PRIVACY.md on GitHub
        </a>
        .
      </p>
    </div>
  );
}
