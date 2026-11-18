import { describe, expect, it } from 'vitest';
import { themeColorSupport, themeNotes } from './themePanel';

describe('active theme panel', () => {
  it('reads colour support from the theme code', () => {
    expect(themeColorSupport('a.design?.primaryColor')).toEqual({ primary: true, secondary: false });
    expect(themeColorSupport('primaryColor secondaryColor')).toEqual({ primary: true, secondary: true });
    expect(themeColorSupport('nothing here')).toEqual({ primary: false, secondary: false });
    expect(themeColorSupport(null)).toEqual({ primary: false, secondary: false });
  });

  it('lists what is missing for the theme to look right', () => {
    const notes = themeNotes({
      store: { design: { logoUrl: '' }, hero: { imageUrl: null } },
      products: [{ productImage: 'x' }, { imagesProduct: [] }, { imagesProduct: [{ imageUrl: 'y' }] }],
      productsTotal: 3,
      categories: [],
      adminNotes: [],
    });
    expect(notes.map((n) => [n.key, n.ok])).toEqual([
      ['logo', false], ['hero', false], ['products', false], ['categories', false],
    ]);
    expect(notes.find((n) => n.key === 'products').count).toBe(1);
  });

  it('all good, plus the theme tip when there is one', () => {
    const notes = themeNotes({
      store: { design: { logoUrl: 'l' }, hero: { imageUrl: 'h' } },
      products: [{ productImage: 'x' }], productsTotal: 1, categories: [{ id: 1 }],
      adminNotes: [{ text_ar: 'نصيحة', text_fr: 'conseil', text_en: 'tip' }], lang: 'fr',
    });
    expect(notes.filter((n) => n.key !== 'tip').every((n) => n.ok)).toBe(true);
    expect(notes.at(-1)).toMatchObject({ key: 'tip', text: 'conseil' });
  });

  it('no products at all → asks to add products', () => {
    const p = themeNotes({ store: {}, products: [], productsTotal: 0, categories: [] }).find((n) => n.key === 'products');
    expect(p).toMatchObject({ ok: false, empty: true });
  });
});
