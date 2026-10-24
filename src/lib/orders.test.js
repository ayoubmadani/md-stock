import { describe, expect, it } from 'vitest';
import { allowedStatuses, statusPayload, whatsappLink, sumCounts } from './orders.js';

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
