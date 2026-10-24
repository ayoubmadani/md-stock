import { describe, it, expect } from 'vitest';
import { canManageStock } from './auth.jsx';

describe('canManageStock', () => {
  it('owner and members with the products permission can manage stock', () => {
    expect(canManageStock({ role: 'owner', permissions: [] })).toBe(true);
    expect(canManageStock({ role: 'member', permissions: ['product.crud'] })).toBe(true);
  });
  it('members without it cannot (no stock or money values)', () => {
    expect(canManageStock({ role: 'member', permissions: ['order.view'] })).toBe(false);
    expect(canManageStock({ role: 'member' })).toBe(false);
  });
});

describe('hasPerm', () => {
  it('owner and wildcard have everything; members only what they were given', async () => {
    const { hasPerm } = await import('./auth.jsx');
    expect(hasPerm({ role: 'owner' }, 'order.view')).toBe(true);
    expect(hasPerm({ role: 'member', permissions: ['*'] }, 'domain.crud')).toBe(true);
    expect(hasPerm({ role: 'member', permissions: ['order.view'] }, 'order.view')).toBe(true);
    expect(hasPerm({ role: 'member', permissions: ['order.view'] }, 'order.manage')).toBe(false);
    expect(hasPerm(null, 'order.view')).toBe(false);
  });
});
