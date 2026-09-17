import { describe, it, expect } from 'vitest';
import { nimToLuna, lunaToNim, isValidLunaAmount, LUNA_PER_NIM } from './luna.js';

describe('luna conversion', () => {
  it('converts whole NIM', () => {
    expect(nimToLuna('1')).toBe(LUNA_PER_NIM);
    expect(nimToLuna('0.1')).toBe(10_000);
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
