import { describe, it, expect } from 'vitest';
import { scanTarget } from './scan-menu';

const canOf = (...perms) => (p) => perms.includes(p);

describe('scanTarget (bottom scan button)', () => {
  it('can sell in the shop → straight to the sale («طلب»)', () => {
    expect(scanTarget(canOf('pos.sell', 'product.crud', 'order.view'))).toBe('/pos');
    expect(scanTarget(canOf('pos.sell'))).toBe('/pos');
  });
  it('no shop selling, but products or orders → product / order info', () => {
    expect(scanTarget(canOf('order.view'))).toBe('/scan/info');
    expect(scanTarget(canOf('product.crud'))).toBe('/scan/info');
  });
  it('no permission → no scan button', () => {
    expect(scanTarget(canOf())).toBeNull();
  });
});
