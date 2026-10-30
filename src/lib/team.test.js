import { describe, expect, it } from 'vitest';
import { PERMISSIONS, togglePerm } from './team';

describe('togglePerm', () => {
  it('adds and removes a permission', () => {
    expect(togglePerm([], 'product.crud')).toEqual(['product.crud']);
    expect(togglePerm(['product.crud'], 'product.crud')).toEqual([]);
  });
  it('order.manage brings order.view with it', () => expect(togglePerm([], 'order.manage').sort()).toEqual(['order.manage', 'order.view']));
  it('order.view cannot be removed while order.manage is on', () => expect(togglePerm(['order.manage', 'order.view'], 'order.view').sort()).toEqual(['order.manage', 'order.view']));
  it('same permission list as the dashboard', () => expect(PERMISSIONS).toEqual(['store.update', 'product.crud', 'category.crud', 'order.view', 'order.manage', 'domain.crud', 'seo.manage', 'delivery.rates', 'delivery.account', 'messages.read']));
});
