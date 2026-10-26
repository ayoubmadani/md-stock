import { describe, expect, it } from 'vitest';
import { combos, quickAttributes, quickErrors, quickProductBody, variantKey, variantUpdates } from './quick-product';

describe('quick product', () => {
  it('no options → simple product with its stock and barcode', () => {
    const b = quickProductBody({ name: ' Mug ', price: '900', stock: '5', barcode: '6111', image: 'https://cdn/m.jpg', attrs: [] });
    expect(b).toMatchObject({ name: 'Mug', price: 900, stock: 5, barcode: '6111', images: ['https://cdn/m.jpg'], attributes: [], offers: [], isActive: true });
  });

  it('any option (size, color, or a custom one like الوزن) becomes an attribute; empty ones are ignored; no simple stock then', () => {
    const attrs = [{ name: 'المقاس', kind: 'size', values: ['M', 'L'] }, { name: 'الوزن', values: ['1kg'] }, { name: 'اللون', values: [] }];
    expect(quickAttributes(attrs).map((a) => [a.type, a.name, a.variants.map((v) => v.value)])).toEqual([['size', 'المقاس', ['M', 'L']], ['text', 'الوزن', ['1kg']]]);
    const b = quickProductBody({ name: 'Set', price: 3000, stock: 4, barcode: '611', attrs });
    expect(b.stock).toBeUndefined();
    expect(b.barcode).toBeNull(); // الباركود يذهب للتركيبة لا للمنتج
  });

  it('needs a name, a price above 0, and a name for every option that has values', () => {
    expect(quickErrors({ name: '', price: '', attrs: [] })).toEqual(['name', 'price']);
    expect(quickErrors({ name: 'Mug', price: '900', attrs: [{ name: ' ', values: ['x'] }] })).toEqual(['attr_name']);
    expect(quickErrors({ name: 'Mug', price: '900', attrs: [{ name: 'Size', values: [] }] })).toEqual([]);
  });
});

describe('quick product variants', () => {
  it('every combination of the options, in order', () => {
    expect(combos([['M', 'L'], ['أحمر']]).map((c) => c.key)).toEqual(['M|أحمر', 'L|أحمر']);
    expect(combos([['M'], []]).map((c) => c.key)).toEqual(['M']);
    expect(combos([['1kg', '2kg'], ['أسود'], ['A']]).map((c) => c.label)).toEqual(['1kg · أسود · A', '2kg · أسود · A']);
    expect(combos([[], []])).toEqual([]);
  });

  it('matches the variants the server generated (new and legacy name shapes)', () => {
    expect(variantKey({ name: [{ attrName: 'المقاس', value: 'M' }, { attrName: 'اللون', value: 'أحمر' }] })).toBe('M|أحمر');
    expect(variantKey({ name: { 'المقاس': 'L' } })).toBe('L');
  });

  it('only variants with a quantity or a barcode get updated', () => {
    const server = [{ id: 'v1', name: [{ value: 'M' }] }, { id: 'v2', name: [{ value: 'L' }] }, { id: 'v3', name: [{ value: 'XL' }] }];
    const rows = { M: { qty: '3', barcode: '' }, L: { qty: '', barcode: '611' }, XL: { qty: '0', barcode: '' } };
    expect(variantUpdates(server, rows)).toEqual([{ variantId: 'v1', stock: 3 }, { variantId: 'v2', barcode: '611' }]);
  });
});
