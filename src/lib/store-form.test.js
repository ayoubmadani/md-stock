import { describe, expect, it } from 'vitest';
import { EMPTY_STORE, generateSubdomain, storePayload, storeToForm } from './store-form';

describe('generateSubdomain', () => {
  it('slugs the name and adds a random suffix (like the dashboard)', () => {
    expect(generateSubdomain('Bebe Store!!', () => 'abc123')).toBe('bebe-store-abc123');
  });
  it('falls back to "store" for a name with no latin letters', () => {
    expect(generateSubdomain('متجر الأطفال', () => 'x1')).toBe('store-x1');
  });
});

describe('storePayload', () => {
  const f = { ...EMPTY_STORE, name: ' Bebe ', phone: ' 0555 ', whatsapp: '0555 12-34', email: '', topBarText: ' hi ', heroTitle: ' T ', supportFreeShipping: true, freeShippingMinAmount: '5000' };

  it('builds the same nested body as the dashboard', () => {
    const p = storePayload(f, { subdomain: 'bebe-1' });
    expect(p.store).toMatchObject({ name: 'Bebe', subdomain: 'bebe-1', freeShippingMinAmount: 5000 });
    expect(p.contact).toMatchObject({ phone: '0555', whatsapp: '05551234', email: null });
    expect(p.topBar).toEqual({ enabled: true, text: 'hi', color: f.primaryColor });
    expect(p.hero.title).toBe('T');
  });
  it('no free shipping → no minimum amount', () => {
    expect(storePayload({ ...f, supportFreeShipping: false }, { subdomain: 'x' }).store.freeShippingMinAmount).toBeNull();
  });
});

describe('storeToForm', () => {
  it('reads a store from the API back into the form', () => {
    const form = storeToForm({ name: 'B', subdomain: 'b-1', currency: 'DZD', contact: { phone: '05' }, design: { logoUrl: 'L', primaryColor: '#111111' }, topBar: { enabled: false, text: 't' }, hero: { title: 'h' }, supportQty: false, freeShippingMinAmount: 3000, supportFreeShipping: true });
    expect(form).toMatchObject({ name: 'B', phone: '05', logo: 'L', primaryColor: '#111111', showTopBar: false, topBarText: 't', heroTitle: 'h', supportQty: false, freeShippingMinAmount: '3000' });
  });
});
