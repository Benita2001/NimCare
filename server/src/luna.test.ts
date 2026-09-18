import { describe, it, expect } from 'vitest';
import { nimToLuna, lunaToNim, isValidLunaAmount, LUNA_PER_NIM } from './luna.js';

describe('luna conversion', () => {
  it('converts whole NIM', () => {
    expect(nimToLuna('1')).toBe(LUNA_PER_NIM);
    expect(nimToLuna('0.1')).toBe(10_000);
  });

  // 2026-09-18 transaction internal_error hotfix: the real-device test sent
  // 0.5 NIM — confirms the exact payload value sent to Nimiq Pay is 50000
  // Luna, not a floating-point approximation.
  it('converts 0.5 NIM to exactly 50000 Luna', () => {
    expect(nimToLuna('0.5')).toBe(50_000);
    expect(Number.isInteger(nimToLuna('0.5'))).toBe(true);
  });

  it('round-trips', () => {
    expect(lunaToNim(nimToLuna('0.1'))).toBe('0.1');
    expect(lunaToNim(nimToLuna('2.5'))).toBe('2.5');
    expect(lunaToNim(LUNA_PER_NIM)).toBe('1');
  });

  it('rejects invalid amounts', () => {
    expect(() => nimToLuna('abc')).toThrow();
    expect(() => nimToLuna('-1')).toThrow();
    expect(() => lunaToNim(-5)).toThrow();
    expect(() => lunaToNim(1.5)).toThrow();
  });

  it('validates luna amounts', () => {
    expect(isValidLunaAmount(100)).toBe(true);
    expect(isValidLunaAmount(0)).toBe(false);
    expect(isValidLunaAmount(-1)).toBe(false);
    expect(isValidLunaAmount(1.5)).toBe(false);
    expect(isValidLunaAmount('100')).toBe(false);
  });
});
