import { describe, expect, it } from 'vitest';
import { ean13CheckDigit, randomStoreEan13, isValidEan13 } from './barcode.js';

describe('EAN-13', () => {
  it('computes the check digit of a known code', () => {
    expect(ean13CheckDigit('400638133393')).toBe(1); // 4006381333931
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333932')).toBe(false);
  });
  it('a generated code is 13 valid digits in the in-store range (starts with 2)', () => {
    for (let i = 0; i < 50; i++) {
      const code = randomStoreEan13();
      expect(code).toMatch(/^2\d{12}$/);
      expect(isValidEan13(code)).toBe(true);
    }
  });
});
