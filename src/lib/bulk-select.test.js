import { describe, it, expect } from 'vitest';
import { toggleId, productState, bulkTargets, posProducts } from './bulk-select';

describe('toggleId', () => {
  it('adds a missing id and removes a present one', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('productState', () => {
  it('active, off in the store only, or fully off', () => {
    expect(productState({})).toBe('active');
    expect(productState({ isActive: false })).toBe('store_off');
    expect(productState({ isActive: false, isArchived: true })).toBe('off');
  });
});

describe('bulkTargets', () => {
  const rows = [{ id: 'a', isActive: true }, { id: 'b', isActive: false }, { id: 'c', isActive: false, isArchived: true }];
  it('keeps only selected products whose state would change', () => {
    expect(bulkTargets(rows, ['a', 'b', 'c'], 'store_off')).toEqual(['a', 'c']);
    expect(bulkTargets(rows, ['a', 'b', 'c'], 'active')).toEqual(['b', 'c']);
    expect(bulkTargets(rows, ['a', 'b', 'c'], 'off')).toEqual(['a', 'b']);
  });
});

describe('posProducts', () => {
  it('hides fully stopped products from the shop, keeps store-only stops', () => {
    expect(posProducts([{ id: 'a' }, { id: 'b', isActive: false }, { id: 'c', isActive: false, isArchived: true }]).map((p) => p.id)).toEqual(['a', 'b']);
  });
});
