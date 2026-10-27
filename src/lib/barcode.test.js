import { describe, expect, it } from 'vitest';
import { ean13CheckDigit, randomStoreEan13, isValidEan13, fillMissingBarcodes } from './barcode.js';

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

describe('fillMissingBarcodes', () => {
  it('fills only empty barcodes, keeps existing ones, never repeats a code', async () => {
    const seq = ['2000000000008', '2000000000008', '2000000000015', '2000000000022'];
    const gen = async () => seq.shift();
    const out = await fillMissingBarcodes(['a', 'b', 'c'], { b: '123' }, gen);
    expect(out).toEqual({ a: '2000000000008', c: '2000000000015' });
  });
  it('treats blank strings as missing', async () => {
    const out = await fillMissingBarcodes(['a'], { a: '  ' }, async () => '2000000000008');
    expect(out).toEqual({ a: '2000000000008' });
  });
});
