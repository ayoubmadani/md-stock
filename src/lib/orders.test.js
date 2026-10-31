import { describe, expect, it } from 'vitest';
import { allowedStatuses, nextActions, paymentState, statusPayload, whatsappLink, sumCounts, orderAmounts, needsCustomer } from './orders.js';

describe('allowedStatuses', () => {
  it('a regular order can take any status', () => {
    expect(allowedStatuses({ status: 'pending' })).toContain('delivered');
    expect(allowedStatuses({ status: 'pending' })).toHaveLength(10);
  });
  it('a digital order never shows shipping or returned', () => {
    const list = allowedStatuses({ status: 'pending', isDigital: true });
    expect(list).not.toContain('shipping');
    expect(list).not.toContain('returned');
  });
  it('an order still at the confirmation company is locked', () => {
    expect(allowedStatuses({ status: 'appl1', confirmationCompanyId: 'c1' })).toEqual([]);
  });
  it('after the company confirms, the merchant can only move it to shipping', () => {
    expect(allowedStatuses({ status: 'confirmed', confirmationCompanyId: 'c1' })).toEqual(['confirmed', 'shipping']);
  });
});

describe('statusPayload', () => {
  it('sends one entry per item with the new status, keeping prices and variants', () => {
    const order = { items: [{ product: { id: 'p1' }, quantity: 2, variantDetailId: 'v1', offerId: null, finalPrice: 1500 }] };
    expect(statusPayload(order, 'confirmed')).toEqual([
      { status: 'confirmed', productId: 'p1', quantity: 2, variantDetailId: 'v1', offerId: null, finalPrice: 1500, totalPrice: 3000 },
    ]);
  });
});

describe('whatsappLink', () => {
  it('turns a local Algerian number into the international form', () => {
    expect(whatsappLink('0555 12 34 56')).toBe('https://wa.me/213555123456');
  });
  it('keeps a number that already has the country code', () => {
    expect(whatsappLink('+213555123456')).toBe('https://wa.me/213555123456');
  });
  it('returns null without a number', () => {
    expect(whatsappLink('')).toBeNull();
  });
});

describe('sumCounts', () => {
  it('maps the server rows to a status → count object with the total under all', () => {
    expect(sumCounts([{ status: 'pending', count: '3' }, { status: 'confirmed', count: '2' }])).toEqual({ pending: 3, confirmed: 2, all: 5 });
  });
});

import { nextActions } from './orders.js';

describe('nextActions (after scanning an order)', () => {
  const kinds = (o) => nextActions(o).map((a) => a.status || a.action);
  it('waiting orders: confirm (or cancel)', () => {
    expect(kinds({ status: 'pending' })).toEqual(['confirmed', 'cancelled']);
    expect(kinds({ status: 'appl2' })).toEqual(['confirmed', 'cancelled']);
  });
  it('confirmed, not uploaded yet: send to the delivery company, or mark in delivery', () => {
    expect(kinds({ status: 'confirmed' })).toEqual(['ship', 'shipping']);
  });
  it('confirmed and already uploaded: hand it over → in delivery', () => {
    expect(kinds({ status: 'confirmed', shippingTrackingId: 'YAL-1' })).toEqual(['shipping']);
  });
  it('in delivery: delivered or returned', () => {
    expect(kinds({ status: 'shipping' })).toEqual(['delivered', 'returned']);
  });
  it('finished orders have no next step', () => {
    expect(kinds({ status: 'delivered' })).toEqual([]);
    expect(kinds({ status: 'returned' })).toEqual([]);
  });
  it('respects the confirmation-company lock', () => {
    expect(kinds({ status: 'appl1', confirmationCompanyId: 'c' })).toEqual([]);
    expect(kinds({ status: 'confirmed', confirmationCompanyId: 'c' })).toEqual(['ship', 'shipping']);
    expect(kinds({ status: 'shipping', confirmationCompanyId: 'c' })).toEqual([]);
  });
  it('digital orders skip delivery', () => {
    expect(kinds({ status: 'confirmed', isDigital: true })).toEqual(['delivered']);
  });
});

describe('in-shop sale (platform pos): only postponed / pay later / sold / cancelled', () => {
  const pos = { platform: 'pos', status: 'delivered', items: [] };
  it('the merchant can choose only these three statuses', () => {
    expect(allowedStatuses(pos)).toEqual(['postponed', 'unpaid', 'delivered', 'cancelled']);
  });
  it('a postponed sale: next step is sold or cancelled; a sold one has no next step', () => {
    expect(nextActions({ ...pos, status: 'postponed' })).toEqual([{ status: 'delivered' }, { status: 'cancelled' }]);
    expect(nextActions(pos)).toEqual([]);
  });
});

describe('pay later: what is paid and what is left', () => {
  it('sums the payments; remaining never below 0; no payments = nothing paid', () => {
    expect(paymentState({ totalPrice: 5000, payments: [{ amount: 2000 }, { amount: 500 }] })).toEqual({ paid: 2500, remaining: 2500 });
    expect(paymentState({ totalPrice: 5000, payments: null })).toEqual({ paid: 0, remaining: 5000 });
  });
  it('an unpaid sale has no «next step» button — payments are recorded in the payment card', () => {
    expect(nextActions({ platform: 'pos', status: 'unpaid', items: [] })).toEqual([]);
  });
});

describe('orderAmounts', () => {
  it('selling price from the lines, total = products + delivery (same as the order page)', () => {
    const o = { totalPrice: 5600, priceShip: 800, items: [{ finalPrice: 4400, quantity: 1 }, { finalPrice: 600, quantity: 2 }] };
    expect(orderAmounts(o)).toEqual({ products: 5600, ship: 800, total: 6400 });
  });
  it('the same after an edit, when the saved total already holds the delivery', () => {
    expect(orderAmounts({ totalPrice: 6400, priceShip: 800, items: [{ finalPrice: 5600, quantity: 1 }] })).toEqual({ products: 5600, ship: 800, total: 6400 });
  });
  it('digital orders have no delivery', () => {
    expect(orderAmounts({ isDigital: true, priceShip: 500, items: [{ finalPrice: 1000, quantity: 1 }] })).toEqual({ products: 1000, ship: 0, total: 1000 });
  });
});

describe('needsCustomer (shop order → «pay later» needs a customer)', () => {
  const shop = { platform: 'pos', customerName: 'زبون المحل', customerPhone: '' };
  it('shop order without a customer phone → pick a customer first', () => {
    expect(needsCustomer(shop, 'unpaid')).toBe(true);
  });
  it('already has a customer, another status, or a website order → no', () => {
    expect(needsCustomer({ ...shop, customerPhone: '0555123456' }, 'unpaid')).toBe(false);
    expect(needsCustomer(shop, 'cancelled')).toBe(false);
    expect(needsCustomer({ ...shop, platform: 'store' }, 'unpaid')).toBe(false);
  });
});
