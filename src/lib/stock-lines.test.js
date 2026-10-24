import { describe, expect, it } from 'vitest';
import { stockLines } from './stock-lines.js';

describe('stockLines', () => {
  it('a product without variants is one line: the product itself', () => {
    expect(stockLines({ id: 'p1', stock: 4, status: 'low', variants: [] })).toEqual([
      { key: 'p1', variantId: null, parts: null, stock: 4, status: 'low' },
    ]);
  });
  it('a product with variants has one line per variant', () => {
    const lines = stockLines({ id: 'p2', stock: 9, status: 'ok', variants: [
      { id: 'v1', parts: [{ mode: 'text', value: 'M' }], stock: 2, status: 'low' },
      { id: 'v2', parts: [{ mode: 'text', value: 'L' }], stock: 7, status: 'ok' },
    ] });
    expect(lines.map((l) => [l.key, l.variantId, l.stock, l.status])).toEqual([['v1', 'v1', 2, 'low'], ['v2', 'v2', 7, 'ok']]);
  });
});
