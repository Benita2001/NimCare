/**
 * Nimiq user-friendly address format: 9 groups of 4 base32 chars (36 chars
 * total), where the first group is "NQ" + 2 check digits.
 *
 * Bug fixed during the 2026-09-18 hardening pass: this previously required
 * 9 groups *after* `NQ\d{2}`, i.e. 10 groups / 40 chars total — one group
 * too many. That's a real off-by-one, not a style nit: it would have
 * rejected every genuine Nimiq address (which are 36 chars / 9 groups
 * total) while a same-session smoke test happened to pass only because it
 * used a hand-typed 40-char fake address. Caught by testing against a real
 * keypair generated with @nimiq/core (see MEMORY.md).
 */
const NIMIQ_ADDRESS_RE = /^NQ\d{2}\s?([0-9A-Z]{4}\s?){8}$/;

export function isValidNimiqAddress(address: unknown): address is string {
  return typeof address === 'string' && NIMIQ_ADDRESS_RE.test(address.trim().toUpperCase());
}

export function normalizeAddress(address: string): string {
  return address.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function shortenAddress(address: string): string {
  const compact = address.replace(/\s+/g, '');
  return `${compact.slice(0, 6)}…${compact.slice(-4)}`;
}
