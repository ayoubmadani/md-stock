import { describe, expect, it } from 'vitest';
import { attrGroups, findVariant, itemsTotal, isFreeShipping, shipPrice, orderPayload, missingFields } from './order-form.js';

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
