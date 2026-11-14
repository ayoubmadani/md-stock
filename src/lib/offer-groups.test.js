import { describe, expect, it } from 'vitest';
import { groupOfferItems, partsLabel } from './offer-groups.js';

// صفحة الطلب: سطور نفس المنتج ونفس العرض تظهر في صندوق واحد (اسم العرض، سعره، المنتج، خيارات القطع).
// عرض قطعتين × 2 يصل سطوراً (L أزرق ×3، XL برتقالي ×1) → صندوق «tow × 2» بمجموع 9000.
const offer = { id: 'o2', name: 'tow', quantity: 2, price: 4500 };
const product = { id: 'p1', name: 'طقم صيفي' };
const line = (id, q, price, parts, extra = {}) => ({ id, productId: 'p1', product, offerId: 'o2', offer, quantity: q, finalPrice: price, variantDetail: { name: parts }, ...extra });
const L = [{ attrName: 'المقاس', value: 'L' }, { attrName: 'اللون', value: 'ازرق' }];
const XL = [{ attrName: 'المقاس', value: 'XL' }, { attrName: 'اللون', value: 'برتقالي' }];

describe('groupOfferItems', () => {
  it('lines of the same product and offer become one box: cards count, pieces, total', () => {
    const items = [line('a', 3, 2250, L), line('b', 1, 2250, XL)];
    const g = groupOfferItems(items);
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ type: 'offer', offer, product, pieces: 4, boxes: 2, total: 9000 });
    expect(g[0].items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('separate add-ons count in the box total; per-piece ones are already inside the price', () => {
    const items = [line('a', 2, 2250, L, { addons: [{ id: 'g', price: 200, qty: 1, separate: true }, { id: 's', price: 50 }] })];
    expect(groupOfferItems(items)[0].total).toBe(4700);
  });

  it('lines without an offer stay single, in their place', () => {
    const plain = { id: 'z', productId: 'p9', product: { name: 'x' }, quantity: 1, finalPrice: 100 };
    const g = groupOfferItems([plain, line('a', 2, 2250, L)]);
    expect(g.map((e) => e.type)).toEqual(['item', 'offer']);
    expect(g[0].item).toBe(plain);
  });

  it('the same offer on another product is another box', () => {
    const other = { ...line('c', 2, 2250, L), productId: 'p2', product: { id: 'p2', name: 'آخر' } };
    expect(groupOfferItems([line('a', 2, 2250, L), other])).toHaveLength(2);
  });
});

describe('partsLabel', () => {
  it('joins option values; empty when no options', () => {
    expect(partsLabel(L)).toBe('L · ازرق');
    expect(partsLabel(undefined)).toBe('');
  });
});
