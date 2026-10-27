import { describe, expect, it } from 'vitest';
import { barcodeFormat, labelLines } from './label';

describe('barcode label', () => {
  it('a valid EAN-13 prints as EAN13, anything else as CODE128', () => {
    expect(barcodeFormat('2001234567893')).toBe('EAN13');
    expect(barcodeFormat('2001234567890')).toBe('CODE128');
    expect(barcodeFormat('ABC-12')).toBe('CODE128');
  });
  it('lines: trimmed name, variant text, price with DA', () => {
    expect(labelLines({ name: ' Mug ', variant: 'M / أحمر', price: '1500' }))
      .toEqual({ name: 'Mug', variant: 'M / أحمر', price: '1,500 DA' });
    expect(labelLines({ name: 'Mug', price: '' })).toEqual({ name: 'Mug', variant: '', price: '' });
  });
});
