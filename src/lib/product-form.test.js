import { describe, expect, it } from 'vitest';
import { productPayload, validateProduct, moveItem, newAttribute, variantPriceField, effectiveVariantPrice } from './product-form.js';

const base = { name: 'قميص', price: '2500', priceOriginal: '', desc: '<p>x</p>', categoryId: '', shippingFree: false, isDigital: false, isActive: true, stock: '7', barcode: ' 123 ' };
const attr = { id: 'att-1', type: 'size', name: 'المقاس', variants: [{ id: 'var-1', name: 'M', value: 'M' }] };
const offer = { id: 'off-1', name: 'قطعتان', subTitle: '', quantity: '2', price: '4500', shippingFree: true };

describe('productPayload', () => {
  it('numbers, trimmed barcode, server-generated variants, offers as numbers', () => {
    const p = productPayload({ ...base }, { attributes: [attr], offers: [offer], images: ['a.jpg'] });
    expect(p).toMatchObject({
      name: 'قميص', price: 2500, priceOriginal: null, categoryId: null, barcode: '123', isActive: true,
      attributes: [attr], variantDetails: [], images: ['a.jpg'],
      offers: [{ id: 'off-1', name: 'قطعتان', subTitle: '', quantity: 2, price: 4500, shippingFree: true }],
    });
  });
  it('sends the stock only for a product without attributes', () => {
    expect(productPayload(base, { attributes: [], offers: [], images: [] }).stock).toBe(7);
    expect(productPayload(base, { attributes: [attr], offers: [], images: [] }).stock).toBeUndefined();
  });
});

describe('validateProduct', () => {
  it('a valid product has no errors', () => {
    expect(validateProduct(base, { attributes: [attr], offers: [offer] })).toEqual([]);
  });
  it('flags name, price, empty or duplicate attributes and incomplete offers', () => {
    const errs = validateProduct({ ...base, name: ' ', price: '0' }, {
      attributes: [{ ...attr, variants: [] }, { ...attr, id: 'att-2' }, { ...attr, id: 'att-3', name: '' }],
      offers: [{ ...offer, price: '' }],
    });
    expect(errs).toEqual(['name', 'price', 'attr_empty', 'attr_duplicate', 'attr_name', 'offer']);
  });
});

describe('moveItem', () => {
  it('moves an image one step and keeps the others in order', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
  });
});

describe('newAttribute', () => {
  it('a size attribute starts with the usual sizes; colour starts empty in colour mode', () => {
    expect(newAttribute('size', 'المقاس').variants.map((v) => v.value)).toEqual(['S', 'M', 'L', 'XL', 'XXL']);
    expect(newAttribute('color', 'اللون')).toMatchObject({ type: 'color', displayMode: 'color', variants: [] });
  });
});

describe('variant price (-1 = the product price)', () => {
  it('a negative price shows as empty (the product price is the hint)', () => {
    expect(variantPriceField(-1)).toBe('');
    expect(variantPriceField(2900)).toBe('2900');
    expect(variantPriceField(0)).toBe('0');
  });
  it('effective price: own price, or the product price when negative/empty', () => {
    expect(effectiveVariantPrice('', 2500)).toBe(2500);
    expect(effectiveVariantPrice(-1, 2500)).toBe(2500);
    expect(effectiveVariantPrice('2900', 2500)).toBe(2900);
  });
});
