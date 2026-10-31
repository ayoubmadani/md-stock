import { describe, expect, it } from 'vitest';
import { addScanned, addService, cartTotal, findPickable, hitLabel, lineInfo, orderToCart, pickedHit, saleBody, setLine } from './pos';

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

// صفوف GET /stores/:s/inventory
const rows = [
  { id: 'p1', name: 'Mug blanc', price: 900, image: 'm.jpg', barcode: '111', stock: 4, variants: [] },
  { id: 'p2', name: 'T-shirt', price: 2500, image: null, barcode: null, stock: 3, variants: [
    { id: 'v1', label: 'M / Rouge', parts: [{ value: 'M' }, { value: 'Rouge' }], barcode: '222', stock: 2, price: 2900 },
    { id: 'v2', label: 'L / Bleu', parts: [{ value: 'L' }, { value: 'Bleu' }], barcode: null, stock: 1, price: 2500 },
  ] },
];

describe('POS product picker', () => {
  it('search by name (any case), product barcode, variant barcode or variant label; empty search shows all', () => {
    expect(findPickable(rows, '').map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(findPickable(rows, 'mug').map((p) => p.id)).toEqual(['p1']);
    expect(findPickable(rows, '111').map((p) => p.id)).toEqual(['p1']);
    expect(findPickable(rows, '222').map((p) => p.id)).toEqual(['p2']);
    expect(findPickable(rows, 'bleu').map((p) => p.id)).toEqual(['p2']);
  });
  it('a picked product / variant enters the cart like a scan (same line, same price)', () => {
    let c = addScanned([], pickedHit(rows[0]));
    c = addScanned(c, pickedHit(rows[1], rows[1].variants[0]));
    c = addScanned(c, pickedHit(rows[0]));
    expect(c.map((l) => [l.key, l.quantity, l.price, l.image])).toEqual([['p1', 2, 900, 'm.jpg'], ['p2:v1', 1, 2900, null]]);
    expect(c[1].parts.map((p) => p.value)).toEqual(['M', 'Rouge']);
  });
});

describe('edit an in-shop sale in the POS', () => {
  // GET /orders/get-one/:id
  const order = { id: 'o5', platform: 'pos', customerName: 'زبون المحل', customerPhone: '', items: [
    { productId: 'p1', product: { id: 'p1', name: 'Mug', price: 900, imagesProduct: [{ imageUrl: 'm.jpg' }] }, variantDetailId: null, quantity: 2, finalPrice: 800 },
    { productId: 'p2', product: { id: 'p2', name: 'Set', price: 2500, imagesProduct: [] }, variantDetailId: 'v1',
      variantDetail: { id: 'v1', name: [{ attrName: 'Taille', value: 'M', displayMode: 'text' }, { attrName: 'Couleur', value: '#f00', displayMode: 'color' }] }, quantity: 1, finalPrice: 2900 },
  ] };

  it('order lines become cart lines (sold price kept), in the same order once saved again', () => {
    const c = orderToCart(order);
    expect(c.map((l) => [l.key, l.quantity, l.price, l.image])).toEqual([['p2:v1', 1, 2900, null], ['p1', 2, 800, 'm.jpg']]);
    expect(c[0].parts).toEqual([{ mode: 'text', value: 'M', attr: 'Taille' }, { mode: 'color', value: '#f00', attr: 'Couleur' }]);
    expect(saleBody(c, {}).items.map((i) => i.productId)).toEqual(['p1', 'p2']);
  });
  it('the default shop-customer name is not shown as a typed name', () => {
    expect(orderToCart.customer(order)).toEqual({ name: '', phone: '' });
    expect(orderToCart.customer({ customerName: 'Karim', customerPhone: '0555123456' })).toEqual({ name: 'Karim', phone: '0555123456' });
  });
});

describe('pay later from the POS', () => {
  it('sale body carries payLater and the deposit (empty deposit = 0)', () => {
    const c = addScanned([], simple);
    expect(saleBody(c, { name: 'Karim', phone: '' }, { payLater: true, paidNow: '300' })).toMatchObject({ customerName: 'Karim', payLater: true, paidNow: 300 });
    expect(saleBody(c, { name: 'Karim' }, { payLater: true, paidNow: '' }).paidNow).toBe(0);
    expect(saleBody(c, { name: '' })).not.toHaveProperty('payLater');
  });
});

describe('sale for a customer from the customers table', () => {
  it('sends the customer id (clientId) when one is picked, nothing otherwise', () => {
    const c = addScanned([], simple);
    expect(saleBody(c, { id: 'c1', name: 'Karim', phone: '0555123456' }).clientId).toBe('c1');
    expect(saleBody(c, { name: '', phone: '' })).not.toHaveProperty('clientId');
  });
});

describe('service lines (no product): water bill, top-up…', () => {
  it('a service is its own line on top; each one is separate even with the same title', () => {
    let c = addScanned([], simple);
    c = addService(c, { title: ' فاتورة ماء ', price: '3200', cost: '3000' }, 1);
    c = addService(c, { title: 'فاتورة ماء', price: 1000, cost: '' }, 2);
    expect(c.map((l) => [l.key, l.name, l.price, l.cost, l.quantity])).toEqual([['svc:2', 'فاتورة ماء', 1000, null, 1], ['svc:1', 'فاتورة ماء', 3200, 3000, 1], ['p1', 'Mug', 900, undefined, 1]]);
    expect(cartTotal(c)).toBe(5100);
  });
  it('sale body: a service line has title + cost and no product', () => {
    const c = addService(addScanned([], simple), { title: 'Flexy', price: 500, cost: 450 }, 1);
    expect(saleBody(c, {}).items).toEqual([
      { productId: 'p1', variantDetailId: undefined, quantity: 1, finalPrice: 900 },
      { title: 'Flexy', cost: 450, quantity: 1, finalPrice: 500 },
    ]);
  });
  it('editing a sale: an order line without product comes back as a service line', () => {
    const c = orderToCart({ items: [{ id: 'i9', productId: null, title: 'فاتورة ماء', cost: '3000.00', quantity: 1, finalPrice: '3200.00' }] });
    expect(c[0]).toMatchObject({ key: 'svc:i9', service: true, name: 'فاتورة ماء', price: 3200, cost: 3000 });
    expect(saleBody(c, {}).items).toEqual([{ title: 'فاتورة ماء', cost: 3000, quantity: 1, finalPrice: 3200 }]);
  });
});

describe('lineInfo (info modal from a cart line)', () => {
  const products = [
    { id: 'p1', name: 'Parfum', price: 4500, stock: 12, status: 'ok', barcode: '111', variants: [] },
    { id: 'p2', name: 'T-shirt', price: 1500, stock: 7, status: 'low', barcode: null, variants: [
      { id: 'v1', label: 'S', stock: 0, price: 1500, status: 'out', barcode: '201' },
      { id: 'v2', label: 'M', stock: 7, price: 1600, status: 'ok', barcode: '202' },
    ] },
  ];
  it('simple product: its own stock, status and barcode', () => {
    expect(lineInfo(products, { productId: 'p1' })).toMatchObject({ product: { id: 'p1' }, variant: null, stock: 12, status: 'ok', price: 4500, barcode: '111' });
  });
  it('option line: the option\'s stock, price and barcode', () => {
    expect(lineInfo(products, { productId: 'p2', variantId: 'v1' })).toMatchObject({ variant: { id: 'v1' }, stock: 0, status: 'out', price: 1500, barcode: '201' });
  });
  it('product gone (deleted / archived elsewhere) → null', () => {
    expect(lineInfo(products, { productId: 'zz' })).toBeNull();
  });
});

describe('hitLabel (green flash on the camera after a scan)', () => {
  it('product name, plus the option in words (text value, or the attribute for colour / image)', () => {
    expect(hitLabel({ product: { name: 'Parfum' }, variant: null })).toBe('Parfum');
    expect(hitLabel({ product: { name: 'T-shirt' }, variant: { parts: [{ mode: 'text', value: 'M', attr: 'Taille' }, { mode: 'color', value: '#f00', attr: 'Couleur' }] } })).toBe('T-shirt — M / Couleur');
  });
});
