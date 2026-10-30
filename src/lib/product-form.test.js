import { describe, expect, it } from 'vitest';
import { productPayload, validateProduct, moveItem, newAttribute, variantPriceField, effectiveVariantPrice, linkVariantImage, pruneVariantImages, COLOR_PALETTE, replaceValue, addValues, uniqueAttrName, duplicateAttrIds, newAddon } from './product-form.js';

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

describe('ربط اللون بصورة من صور المنتج', () => {
  const attrs = [{ id: 'a1', type: 'color', name: 'اللون', variants: [{ id: 'v1', name: '#f00', value: '#f00' }, { id: 'v2', name: '#00f', value: '#00f', imageUrl: 'B' }] }];
  it('links and unlinks one value', () => {
    expect(linkVariantImage(attrs[0], 'v1', 'A').variants[0].imageUrl).toBe('A');
    expect(linkVariantImage(attrs[0], 'v2', null).variants[1].imageUrl).toBeNull();
  });
  it('a removed product image is unlinked from its colour', () => {
    const out = pruneVariantImages(attrs, ['A']);
    expect(out[0].variants[1].imageUrl).toBeNull();
    expect(pruneVariantImages(attrs, ['B'])).toBe(attrs); // لا تغيير → نفس المرجع
  });
});

describe('نافذة الألوان', () => {
  it('palette: rows of shades, all valid hex, no duplicates', () => {
    const all = COLOR_PALETTE.flat();
    expect(COLOR_PALETTE.length).toBeGreaterThanOrEqual(8);
    expect(all.every((c) => /^#[0-9a-f]{6}$/.test(c))).toBe(true);
    expect(new Set(all).size).toBe(all.length);
  });
  it('replaceValue edits one value and keeps its id and linked image', () => {
    const attr = { variants: [{ id: 'v1', name: '#ff0000', value: '#ff0000', imageUrl: 'A' }, { id: 'v2', name: '#0000ff', value: '#0000ff' }] };
    const out = replaceValue(attr, 'v1', '#00ff00');
    expect(out.variants[0]).toEqual({ id: 'v1', name: '#00ff00', value: '#00ff00', imageUrl: 'A' });
    expect(replaceValue(attr, 'v1', '#0000ff')).toBeNull(); // لون موجود في قيمة أخرى
  });
});

describe('إضافة عدة ألوان مرة واحدة', () => {
  it('adds the new ones in order and skips existing or repeated', () => {
    const attr = { variants: [{ id: 'v1', name: '#ff0000', value: '#ff0000' }] };
    const out = addValues(attr, ['#00ff00', '#ff0000', '#0000ff', '#00ff00']);
    expect(out.variants.map((v) => v.value)).toEqual(['#ff0000', '#00ff00', '#0000ff']);
    expect(new Set(out.variants.map((v) => v.id)).size).toBe(3);
  });
});

describe('أسماء الخصائص لا تتكرر', () => {
  const attrs = [{ id: 'a', name: 'اللون' }, { id: 'b', name: 'المقاس' }];
  it('a new attribute gets a free name', () => {
    expect(uniqueAttrName(attrs, 'الخامة')).toBe('الخامة');
    expect(uniqueAttrName(attrs, 'اللون')).toBe('اللون 2');
    expect(uniqueAttrName([...attrs, { id: 'c', name: 'اللون 2' }], 'اللون')).toBe('اللون 3');
  });
  it('flags every attribute whose name repeats (ignoring case and spaces)', () => {
    expect([...duplicateAttrIds([...attrs, { id: 'c', name: ' اللون ' }])].sort()).toEqual(['a', 'c']);
    expect(duplicateAttrIds(attrs).size).toBe(0);
  });
});

describe('add-ons (الإضافات)', () => {
  it('a new add-on is an empty, shown row with its own id', () => {
    const a = newAddon();
    expect(a).toMatchObject({ name: '', price: '', isActive: true });
    expect(a.id).toBeTruthy();
    expect(newAddon().id).not.toBe(a.id);
  });

  it('the payload drops nameless rows, trims names, numbers the price and keeps hidden ones', () => {
    const addons = [{ id: 'a', name: ' جبن ', price: '300', isActive: true }, { id: 'b', name: '', price: '50' }, { id: 'c', name: 'صلصة', price: '', isActive: false }];
    expect(productPayload(base, { attributes: [], offers: [], images: [], addons }).addons).toEqual([
      { id: 'a', name: 'جبن', price: 300, isActive: true },
      { id: 'c', name: 'صلصة', price: 0, isActive: false },
    ]);
  });

  it('no add-ons list → the field is not sent (the server keeps what it has)', () => {
    expect('addons' in productPayload(base, { attributes: [], offers: [], images: [] })).toBe(false);
  });
});
