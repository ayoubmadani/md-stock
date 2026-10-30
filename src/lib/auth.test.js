import { describe, it, expect } from 'vitest';
import { canManageStock, isStoreOwner, navVisible } from './auth.jsx';

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

describe('isStoreOwner', () => {
  it('only the owner of the current store (profit and Meta ads)', () => {
    expect(isStoreOwner({ role: 'owner' })).toBe(true);
    expect(isStoreOwner({ role: 'member', permissions: ['*'] })).toBe(false);
    expect(isStoreOwner(null)).toBe(false);
  });
});

describe('navVisible', () => {
  const member = { can: (p) => p === 'order.view', isOwner: false, ownsAnyStore: true };
  const owner = { can: () => true, isOwner: true, ownsAnyStore: true };
  it('owner-only items (profit, Meta, wallet…) are hidden from team members, also in the sidebar', () => {
    expect(navVisible({ storeOwner: true }, member)).toBe(false);
    expect(navVisible({ storeOwner: true }, owner)).toBe(true);
  });
  it('permission items follow the group, «all» items show to everyone', () => {
    expect(navVisible({ perm: 'order.view' }, member)).toBe(true);
    expect(navVisible({ perm: ['product.crud', 'order.view'] }, member)).toBe(true);
    expect(navVisible({ perm: 'delivery.rates' }, member)).toBe(false);
    expect(navVisible({ all: true }, member)).toBe(true);
    expect(navVisible({}, member)).toBe(true);
    expect(navVisible({ owner: true }, { ...member, ownsAnyStore: false })).toBe(false);
  });
});
