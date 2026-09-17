/** Nimiq user-friendly address format: "NQ" + 2 check digits + 9 groups of 4 base32 chars. */
const NIMIQ_ADDRESS_RE = /^NQ\d{2}\s?([0-9A-Z]{4}\s?){9}$/;

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
