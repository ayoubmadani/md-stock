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
  it('sends the logo and the favicon in design', () => {
    expect(storePayload({ ...f, logo: 'L', favicon: 'F' }, { subdomain: 'x' }).design).toMatchObject({ logoUrl: 'L', faviconUrl: 'F' });
  });
  it('no free shipping → no minimum amount', () => {
    expect(storePayload({ ...f, supportFreeShipping: false }, { subdomain: 'x' }).store.freeShippingMinAmount).toBeNull();
  });
});

describe('storeToForm', () => {
  it('reads a store from the API back into the form', () => {
    const form = storeToForm({ name: 'B', subdomain: 'b-1', currency: 'DZD', contact: { phone: '05' }, design: { logoUrl: 'L', faviconUrl: 'F', primaryColor: '#111111' }, topBar: { enabled: false, text: 't' }, hero: { title: 'h' }, supportQty: false, freeShippingMinAmount: 3000, supportFreeShipping: true });
    expect(form).toMatchObject({ name: 'B', phone: '05', logo: 'L', favicon: 'F', primaryColor: '#111111', showTopBar: false, topBarText: 't', heroTitle: 'h', supportQty: false, freeShippingMinAmount: '3000' });
  });
});

describe('showStoreName (اسم المتجر بجانب الشعار)', () => {
  it('off by default and sent inside design', () => {
    expect(EMPTY_STORE.showStoreName).toBe(false);
    expect(storePayload({ ...EMPTY_STORE, showStoreName: true }, { subdomain: 'x' }).design.showStoreName).toBe(true);
    expect(storePayload(EMPTY_STORE, { subdomain: 'x' }).design.showStoreName).toBe(false);
  });
  it('read back from the saved design', () => {
    expect(storeToForm({ design: { showStoreName: true } }).showStoreName).toBe(true);
    expect(storeToForm({ design: {} }).showStoreName).toBe(false);
  });
});

describe('phone cover (heroImageMobile)', () => {
  it('sent as hero.mobileImageUrl, null when empty', () => {
    expect(storePayload({ ...EMPTY_STORE, heroImageMobile: 'M' }, { subdomain: 'x' }).hero.mobileImageUrl).toBe('M');
    expect(storePayload(EMPTY_STORE, { subdomain: 'x' }).hero.mobileImageUrl).toBeNull();
  });
  it('read back from the saved hero', () => {
    expect(storeToForm({ hero: { mobileImageUrl: 'M' } }).heroImageMobile).toBe('M');
    expect(storeToForm({}).heroImageMobile).toBeNull();
  });
});
