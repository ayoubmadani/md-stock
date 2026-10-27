import { describe, expect, it } from 'vitest';
import { valueGroups, barHeights } from './product-insights';

const v = (id, parts, units, isActive = true) => ({ id, isActive, orders: units, units, revenue: units * 100, name: parts.map(([attrName, value]) => ({ attrName, value, displayMode: 'text' })) });

describe('valueGroups', () => {
  it('sums each attribute value across its combinations, best seller first', () => {
    const g = valueGroups([v('a', [['Size', 'M'], ['Color', 'Red']], 3), v('b', [['Size', 'L'], ['Color', 'Red']], 5, false), v('c', [['Size', 'M'], ['Color', 'Blue']], 1)]);
    expect(g.Size.map((x) => [x.value, x.units])).toEqual([['L', 5], ['M', 4]]);
    expect(g.Color[0]).toMatchObject({ value: 'Red', units: 8, total: 2, activeCount: 1, revenue: 800 });
  });
});

describe('barHeights', () => {
  it('scales to the busiest day (percent), 0 when there are no orders', () => {
    expect(barHeights([{ orders: 2 }, { orders: 4 }, { orders: 0 }])).toEqual([50, 100, 0]);
    expect(barHeights([{ orders: 0 }])).toEqual([0]);
  });
});
