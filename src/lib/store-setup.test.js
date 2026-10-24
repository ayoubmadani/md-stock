import { describe, expect, it } from 'vitest';
import { flattenTree, parentOptions, normalizeDomain } from './store-setup.js';

const tree = [
  { id: 'a', name: 'ملابس', children: [{ id: 'a1', name: 'رجالي', children: [{ id: 'a11', name: 'قمصان' }] }] },
  { id: 'b', name: 'أحذية' },
];

describe('flattenTree', () => {
  it('lists every category with its depth, parents first', () => {
    expect(flattenTree(tree).map((c) => [c.id, c.level])).toEqual([['a', 0], ['a1', 1], ['a11', 2], ['b', 0]]);
  });
});

describe('parentOptions', () => {
  it('a category cannot be moved under itself or one of its own sub-categories', () => {
    expect(parentOptions(tree, 'a1').map((c) => c.id)).toEqual(['a', 'b']);
  });
  it('a new category can go under any category', () => {
    expect(parentOptions(tree, null)).toHaveLength(4);
  });
});

describe('normalizeDomain', () => {
  it('keeps only the host, in lower case', () => {
    expect(normalizeDomain(' https://Shop.Example.com/ar/page ')).toBe('shop.example.com');
    expect(normalizeDomain('example.com')).toBe('example.com');
  });
  it('rejects something that is not a domain', () => {
    expect(normalizeDomain('hello')).toBeNull();
    expect(normalizeDomain('')).toBeNull();
  });
});
