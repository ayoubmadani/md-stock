import { describe, it, expect } from 'vitest';
import { externalParts, isExternalLine } from './external-line.js';

describe('external lines (WooCommerce…)', () => {
  it('a line from a connected shop without an MD Store product is external; a linked one is not', () => {
    expect(isExternalLine({ productId: null, external: { platform: 'woocommerce' } })).toBe(true);
    expect(isExternalLine({ productId: 'p1', external: { platform: 'woocommerce' } })).toBe(false);
    expect(isExternalLine({ productId: null, external: null })).toBe(false);
  });

  it('its options become parts: colour dot, picture or text, with their names', () => {
    expect(externalParts({ variant: [
      { attrName: 'Couleur', value: 'Couleur 1', displayMode: 'color', color: '#2e4084' },
      { attrName: 'Modèle', value: 'Couleur 5', displayMode: 'image', image: 'https://cdn.test/5.jpg' },
      { attrName: 'size', value: 'l', displayMode: 'text' },
    ] })).toEqual([
      { displayMode: 'color', value: '#2e4084', attrName: 'Couleur', label: 'Couleur 1' },
      { displayMode: 'image', value: 'https://cdn.test/5.jpg', attrName: 'Modèle', label: 'Couleur 5' },
      { displayMode: 'text', value: 'l', attrName: 'size', label: '' },
    ]);
  });

  it('without option details: the options text', () => {
    expect(externalParts({ options: 'Couleur: Rouge / Taille: XL' })).toEqual([{ displayMode: 'text', value: 'Couleur: Rouge / Taille: XL', attrName: '', label: '' }]);
    expect(externalParts(null)).toEqual([]);
  });
});
