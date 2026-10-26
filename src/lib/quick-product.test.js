import { describe, expect, it } from 'vitest';
import { quickAttributes, quickProductBody, quickErrors } from './quick-product';

describe('quick product', () => {
  it('no sizes / colors → simple product with its stock and barcode', () => {
    const b = quickProductBody({ name: ' Mug ', price: '900', stock: '5', barcode: '6111', image: 'https://cdn/m.jpg', sizes: [], colors: [] }, { size: 'المقاس', color: 'اللون' });
    expect(b).toMatchObject({ name: 'Mug', price: 900, stock: 5, barcode: '6111', images: ['https://cdn/m.jpg'], attributes: [], offers: [], isActive: true });
  });

  it('chosen sizes / colors become attributes (the server makes the variants); no simple stock then', () => {
    const attrs = quickAttributes({ sizes: ['M', 'L'], colors: ['أحمر'] }, { size: 'المقاس', color: 'اللون' });
    expect(attrs.map((a) => [a.type, a.name, a.variants.map((v) => v.value)])).toEqual([['size', 'المقاس', ['M', 'L']], ['text', 'اللون', ['أحمر']]]);
    const b = quickProductBody({ name: 'Set', price: 3000, stock: 4, sizes: ['M'], colors: [] }, { size: 'المقاس', color: 'اللون' });
    expect(b.stock).toBeUndefined();
    expect(b.images).toEqual([]);
  });

  it('needs a name and a price above 0', () => {
    expect(quickErrors({ name: '', price: '' })).toEqual(['name', 'price']);
    expect(quickErrors({ name: 'Mug', price: '900' })).toEqual([]);
  });
});
