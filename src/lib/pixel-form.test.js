import { describe, expect, it } from 'vitest';
import { pixelPayload, pixelError, productPixels } from './pixel-form';

const base = { name: ' Main ', type: 'facebook', pixelId: ' 123 ', accessToken: '', testEventCode: ' TEST1 ', clearToken: false, isActive: true };

describe('pixelPayload', () => {
  it('trims fields and never sends an empty token on edit (keeps the saved one)', () => {
    expect(pixelPayload(base)).toEqual({ name: 'Main', type: 'facebook', pixelId: '123', testEventCode: 'TEST1', isActive: true, scope: 'store', events: expect.any(Array) });
  });
  it('sends a new token when typed', () => expect(pixelPayload({ ...base, accessToken: ' EAA ' }).accessToken).toBe('EAA'));
  it('sends "" to clear the token', () => expect(pixelPayload({ ...base, clearToken: true }).accessToken).toBe(''));
  it('drops CAPI fields for non-facebook pixels', () => {
    const p = pixelPayload({ ...base, type: 'tiktok', accessToken: 'x' });
    expect(p).not.toHaveProperty('accessToken');
    expect(p).not.toHaveProperty('testEventCode');
  });
  it('does not change the scope of an existing pixel', () => expect(pixelPayload(base, true)).not.toHaveProperty('scope'));
  it('a new pixel gets the default events, like the dashboard', () => expect(pixelPayload(base).events).toEqual(['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase']));
});

describe('pixelError', () => {
  it('requires a pixel id', () => expect(pixelError({ ...base, pixelId: ' ' })).toBe('pixels.id_required'));
  it('facebook ids are digits', () => expect(pixelError({ ...base, pixelId: 'abc' })).toBe('pixels.id_digits'));
  it('accepts a valid pixel', () => expect(pixelError(base)).toBeNull());
  it('tiktok ids may contain letters', () => expect(pixelError({ ...base, type: 'tiktok', pixelId: 'CABC123' })).toBeNull());
});

describe('product pixels', () => {
  it('a new pixel for a product is scoped to that product', () => {
    const p = pixelPayload(base, false, 'P1');
    expect(p.scope).toBe('product');
    expect(p.productId).toBe('P1');
  });
  it('editing a product pixel does not touch its scope', () => expect(pixelPayload(base, true, 'P1')).not.toHaveProperty('productId'));
  it('product pixels are picked by product', () => {
    const list = [{ id: 1, scope: 'store' }, { id: 2, scope: 'product', productId: 'P1' }, { id: 3, scope: 'product', productId: 'P2' }];
    expect(productPixels(list, 'P1').map((p) => p.id)).toEqual([2]);
  });
});
