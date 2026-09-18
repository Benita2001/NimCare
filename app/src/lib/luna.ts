export const LUNA_PER_NIM = 100_000;

export function nimToLuna(nim: string): number {
  const trimmed = nim.trim();
  if (!/^\d+(\.\d{1,5})?$/.test(trimmed)) {
    throw new Error(`Invalid NIM amount: "${nim}"`);
  }
  const [whole, frac = ''] = trimmed.split('.');
  const paddedFrac = frac.padEnd(5, '0');
  return Number(BigInt(whole) * BigInt(LUNA_PER_NIM) + BigInt(paddedFrac));
}

export function lunaToNim(luna: number): string {
  const whole = Math.floor(luna / LUNA_PER_NIM);
  const frac = luna % LUNA_PER_NIM;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(5, '0')}`.replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * UI-only crash protection — never a substitute for authorization
 * validation. A malformed/missing address (e.g. a stale legacy pair row
 * with a null member) must never throw during render; it falls back to a
 * safe display string instead. See MEMORY.md 2026-09-18 blank-screen hotfix.
 */
export function shortenAddress(address?: string | null): string {
  if (typeof address !== 'string' || address.trim().length === 0) {
    return 'Unknown wallet';
  }
  const compact = address.replace(/\s+/g, '');
  if (compact.length <= 10) return compact;
  return `${compact.slice(0, 6)}…${compact.slice(-4)}`;
}
