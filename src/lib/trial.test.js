import { describe, expect, it } from 'vitest';
import { trialDismissKey } from './trial';

const jwt = (payload) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`;

describe('trialDismissKey — إخفاء عرض التجربة لكل حساب على حدة', () => {
  it('مفتاح مختلف لكل حساب (من الـ token)', () => {
    expect(trialDismissKey(jwt({ sub: 'u1' }))).toBe('trialOfferDismissed:u1');
    expect(trialDismissKey(jwt({ id: 'u2' }))).toBe('trialOfferDismissed:u2');
  });
  it('token غير صالح ← المفتاح العام', () => {
    expect(trialDismissKey('mock')).toBe('trialOfferDismissed');
    expect(trialDismissKey(null)).toBe('trialOfferDismissed');
  });
});
