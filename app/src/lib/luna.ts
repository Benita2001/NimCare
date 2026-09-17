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

export function shortenAddress(address: string): string {
  const compact = address.replace(/\s+/g, '');
  return `${compact.slice(0, 6)}…${compact.slice(-4)}`;
}
