import { describe, it, expect } from 'vitest';
import { scanChoices } from './scan-menu';

const canOf = (...perms) => (p) => perms.includes(p);

describe('scanChoices (bottom scan button)', () => {
  it('owner / full member: both — order (sale) and info', () => {
    expect(scanChoices(canOf('pos.sell', 'product.crud', 'order.view')).map((c) => c.key)).toEqual(['order', 'info']);
  });
  it('seller only: just the sale → opens directly', () => {
    expect(scanChoices(canOf('pos.sell')).map((c) => c.to)).toEqual(['/pos']);
  });
  it('orders or products only: just info', () => {
    expect(scanChoices(canOf('order.view')).map((c) => c.to)).toEqual(['/scan/info']);
    expect(scanChoices(canOf('product.crud')).map((c) => c.to)).toEqual(['/scan/info']);
  });
  it('no permission: nothing', () => {
    expect(scanChoices(canOf())).toEqual([]);
  });
});
