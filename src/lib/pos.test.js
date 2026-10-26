import { describe, expect, it } from 'vitest';
import { addScanned, cartTotal, saleBody, setLine } from './pos';

const simple = { product: { id: 'p1', name: 'Mug', price: 900, image: null }, variant: null };
const variant = { product: { id: 'p2', name: 'Set', price: 2500 }, variant: { id: 'v1', price: 2900, parts: [{ value: 'M' }] } };

describe('POS cart', () => {
  it('scanning the same item again adds one; another variant is its own line', () => {
    let c = addScanned([], simple);
    c = addScanned(c, simple);
    c = addScanned(c, variant);
    expect(c.map((l) => [l.key, l.quantity, l.price])).toEqual([['p2:v1', 1, 2900], ['p1', 2, 900]]);
  });
  it('latest scan goes to the top so the merchant sees it', () => {
    const c = addScanned(addScanned([], simple), variant);
    expect(c[0].key).toBe('p2:v1');
  });
  it('edit quantity / price; quantity 0 removes the line', () => {
    let c = addScanned([], simple);
    c = setLine(c, 'p1', { quantity: 3, price: 800 });
    expect(cartTotal(c)).toBe(2400);
    expect(setLine(c, 'p1', { quantity: 0 })).toEqual([]);
  });
  it('sale body for POST /orders/:storeId/pos — lines in scan order (oldest first)', () => {
    const c = addScanned(addScanned([], variant), simple);
    expect(saleBody(c, { name: ' ', phone: '0555123456' })).toEqual({
      items: [{ productId: 'p2', variantDetailId: 'v1', quantity: 1, finalPrice: 2900 }, { productId: 'p1', variantDetailId: undefined, quantity: 1, finalPrice: 900 }],
      customerName: undefined, customerPhone: '0555123456',
    });
  });
});
