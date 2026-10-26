import { describe, expect, it } from 'vitest';
import { themeName, themeStatus } from './themes';

describe('themeName', () => {
  const th = { name_ar: 'أزرق', name_fr: 'Bleu', name_en: 'Blue' };
  it('uses the UI language, then English', () => {
    expect(themeName(th, 'ar')).toBe('أزرق');
    expect(themeName(th, 'fr')).toBe('Bleu');
    expect(themeName({ name_en: 'Blue' }, 'ar')).toBe('Blue');
  });
});

describe('themeStatus', () => {
  const ctx = { activeId: 'a', myIds: ['a', 'b'], planIds: ['p'] };
  it('active > installed > in plan > free > paid', () => {
    expect(themeStatus({ id: 'a', price: 1500 }, ctx)).toBe('active');
    expect(themeStatus({ id: 'b', price: 1500 }, ctx)).toBe('installed');
    expect(themeStatus({ id: 'p', price: 1500 }, ctx)).toBe('plan');
    expect(themeStatus({ id: 'f', price: '0' }, ctx)).toBe('free');
    expect(themeStatus({ id: 'x', price: 1500 }, ctx)).toBe('paid');
  });
});
