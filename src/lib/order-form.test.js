import { describe, expect, it } from 'vitest';
import { attrGroups, findVariant, itemsTotal, isFreeShipping, shipPrice, orderPayload, missingFields, editAddon, itemAddonQty } from './order-form.js';

const v = (id, attrs, extra = {}) => ({ id, name: attrs.map(([attrName, value]) => ({ attrName, value })), stock: 5, ...extra });
const variants = [v('a', [['Size', 'M'], ['Color', 'Red']]), v('b', [['Size', 'L'], ['Color', 'Red']]), v('c', [['Size', 'L'], ['Color', 'Blue']], { stock: 0 })];

describe('attrGroups', () => {
  it('groups the options of each attribute once, in order', () => {
    expect(attrGroups(variants).map((g) => [g.key, g.options.map((o) => o.value)])).toEqual([['Size', ['M', 'L']], ['Color', ['Red', 'Blue']]]);
  });
});

describe('findVariant', () => {
  it('finds the exact combination after changing one attribute', () => {
    expect(findVariant(variants, variants[0].name, 'Size', 'L').id).toBe('b');
  });
  it('refuses a full combination that is out of stock', () => {
    expect(findVariant(variants, variants[1].name, 'Color', 'Blue')).toBeNull();
  });
  it('without a previous choice, picks the first available variant with that value', () => {
    expect(findVariant(variants, [], 'Color', 'Red').id).toBe('a');
  });
});

describe('totals and shipping', () => {
  const items = [{ finalPrice: 1500, quantity: 2 }, { finalPrice: 1000, quantity: 1 }];
  it('sums price × quantity', () => expect(itemsTotal(items)).toBe(4000));
  it('adds separate add-ons (price × their own qty) once per line; old per-piece add-ons are already in the price', () => {
    const withAddons = [{ finalPrice: 1000, quantity: 2, addons: [{ id: 'c', name: 'جبن', price: 100, qty: 3, separate: true }, { id: 's', name: 'صلصة', price: 50 }] }];
    expect(itemsTotal(withAddons)).toBe(2300);
  });
  it('a free-shipping product or offer makes the whole order free', () => {
    expect(isFreeShipping({ items: [{ ...items[0], product: { shippingFree: true } }] }, null)).toBe(true);
    expect(isFreeShipping({ items: [{ ...items[0], offer: { shippingFree: true } }] }, null)).toBe(true);
  });
  it('the store threshold applies only when enabled', () => {
    expect(isFreeShipping({ items }, { supportFreeShipping: true, freeShippingMinAmount: 4000 })).toBe(true);
    expect(isFreeShipping({ items }, { supportFreeShipping: true, freeShippingMinAmount: 5000 })).toBe(false);
    expect(isFreeShipping({ items }, { supportFreeShipping: false, freeShippingMinAmount: 1 })).toBe(false);
  });
  it('picks the home or office price of the wilaya', () => {
    const w = { livraisonHome: '600', livraisonOfice: '400' };
    expect(shipPrice(w, 'home')).toBe(600);
    expect(shipPrice(w, 'office')).toBe(400);
    expect(shipPrice(null, 'home')).toBe(0);
  });
});

describe('orderPayload', () => {
  const form = {
    customerName: ' Ali ', customerPhone: ' 0555 ', customerEmail: '', customerWhatsapp: '',
    customerWilayaId: 16, customerCommuneId: 554, typeShip: 'home', priceShip: 600, status: 'confirmed',
    items: [{ productId: 'p1', quantity: 2, variantDetailId: 'v1', offerId: null, finalPrice: 1500 }],
  };
  it('edit: one entry per item with customer fields, keeping the status', () => {
    expect(orderPayload(form, { free: false })).toEqual([{
      customerName: 'Ali', customerPhone: '0555', customerEmail: undefined, customerWhatsapp: undefined,
      customerWilayaId: 16, customerCommuneId: 554, status: 'confirmed', typeShip: 'home', priceShip: 600,
      productId: 'p1', quantity: 2, variantDetailId: 'v1', offerId: null, finalPrice: 1500,
    }]);
  });
  it('create: adds the store, the dashboard platform and the line total, without status', () => {
    const [d] = orderPayload(form, { free: true, storeId: 's1' });
    expect(d).toMatchObject({ storeId: 's1', platform: 'dashboard', priceShip: 0, priceLoss: 0, totalPrice: 3000 });
    expect(d.status).toBeUndefined();
  });
});

describe('missingFields', () => {
  it('lists what a physical order still needs', () => {
    expect(missingFields({ customerName: '', customerPhone: '1', items: [] })).toEqual(['name', 'wilaya', 'commune', 'items']);
  });
  it('a digital order needs an email or WhatsApp instead of an address', () => {
    expect(missingFields({ customerName: 'a', customerPhone: '1', isDigital: true, items: [{}] })).toEqual(['contact']);
  });
});

describe('editing add-ons in an order', () => {
  const product = { addons: [{ id: 'c', name: 'جبن', price: 100, maxQty: 3 }, { id: 's', name: 'صلصة', price: 50 }, { id: 'x', name: 'مخفي', price: 9, isActive: false }] };

  it('current quantities come from the saved line (separate keep their qty)', () => {
    expect(itemAddonQty({ product, addons: [{ id: 'c', price: 100, qty: 2, separate: true }] })).toEqual({ c: 2 });
    expect(itemAddonQty({ product, addonQty: { s: 1 } })).toEqual({ s: 1 });
  });

  it('set a quantity: total = price × qty + add-ons, payload sends addonQty', () => {
    let it = { product, productId: 'p', quantity: 2, finalPrice: 1000, addons: null };
    it = { ...it, ...editAddon(it, 'c', 3) };
    expect(it.addonQty).toEqual({ c: 3 });
    expect(itemsTotal([it])).toBe(2300);
    expect(orderPayload({ items: [it] })[0].addonQty).toEqual({ c: 3 });
    it = { ...it, ...editAddon(it, 'c', 0) };
    expect(it.addonQty).toEqual({});
    expect(itemsTotal([it])).toBe(2000);
  });

  it('an old per-piece add-on (price inside finalPrice) is converted without changing the total', () => {
    let it = { product, productId: 'p', quantity: 2, finalPrice: 1050, addons: [{ id: 's', name: 'صلصة', price: 50 }] };
    expect(itemsTotal([it])).toBe(2100);
    it = { ...it, ...editAddon(it, 'c', 1) };
    expect(it.finalPrice).toBe(1000);
    expect(it.addonQty).toEqual({ s: 2, c: 1 });
    expect(itemsTotal([it])).toBe(2200);
  });

  it('untouched line: no addonQty in the payload (the server keeps its add-ons)', () => {
    expect('addonQty' in orderPayload({ items: [{ productId: 'p', quantity: 1, finalPrice: 10 }] })[0]).toBe(false);
  });
});
