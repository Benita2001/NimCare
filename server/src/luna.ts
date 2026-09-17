/**
 * Integer-Luna helpers. 1 NIM = 100_000 Luna. Never use floats for on-chain amounts.
 */

export const LUNA_PER_NIM = 100_000;

export function nimToLuna(nim: string): number {
  const trimmed = nim.trim();
  if (!/^\d+(\.\d{1,5})?$/.test(trimmed)) {
    throw new Error(`Invalid NIM amount: "${nim}"`);
  }
  const [whole, frac = ''] = trimmed.split('.');
  const paddedFrac = frac.padEnd(5, '0');
  const luna = BigInt(whole) * BigInt(LUNA_PER_NIM) + BigInt(paddedFrac);
  if (luna > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Amount too large');
  }
  return Number(luna);
}

export function lunaToNim(luna: number): string {
  if (!Number.isInteger(luna) || luna < 0) {
    throw new Error(`Invalid Luna amount: ${luna}`);
  }
  const whole = Math.floor(luna / LUNA_PER_NIM);
  const frac = luna % LUNA_PER_NIM;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(5, '0')}`.replace(/0+$/, '').replace(/\.$/, '');
}

export function isValidLunaAmount(luna: unknown): luna is number {
  return typeof luna === 'number' && Number.isInteger(luna) && luna > 0 && Number.isSafeInteger(luna);
}
