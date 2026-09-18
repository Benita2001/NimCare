import { Address } from '@nimiq/core';

/**
 * Real Nimiq address validation via @nimiq/core's own parser, not a regex.
 *
 * A regex (the previous implementation here) can only check the group/
 * character-count *format* — it cannot verify the two embedded ISO 7064
 * MOD 97-10 check digits. A format-correct string with a wrong checksum
 * passes a regex but is rejected by Nimiq Pay itself when a real
 * transaction is attempted, which was a live suspect in the 2026-09-18
 * real-device `internal_error` investigation (see MEMORY.md). Verified
 * directly against @nimiq/core: a genuine address parses, a checksum-
 * tampered but format-correct address throws "Invalid checksum", and
 * malformed strings throw "Wrong length" / "Wrong country code".
 */
export function isValidNimiqAddress(address: unknown): address is string {
  if (typeof address !== 'string') return false;
  try {
    Address.fromUserFriendlyAddress(address.trim().toUpperCase());
    return true;
  } catch {
    return false;
  }
}

export function normalizeAddress(address: string): string {
  return address.trim().toUpperCase().replace(/\s+/g, ' ');
}

export function shortenAddress(address: string): string {
  const compact = address.replace(/\s+/g, '');
  return `${compact.slice(0, 6)}…${compact.slice(-4)}`;
}
