import { describe, expect, it } from 'vitest';
import { groupDomains, DNS_RECORD } from './domains';

describe('groupDomains', () => {
  const list = [
    { id: 'store', domain: 'bebe.mdstore.top', isActive: true, scope: 'store' },
    { id: 'store2', domain: 'dove.mdstore.top', isActive: true, scope: 'store' },
    { id: 'custom-ok', domain: 'bebe.com', isActive: true, scope: 'store' },
    { id: 'custom-wait', domain: 'shop.dz', isActive: false, scope: 'store' },
    { id: 'lp-sub', domain: 'promo.mdstore.top', isActive: true, scope: 'landing_page', builderPageId: 'p1' },
    { id: 'lp-custom', domain: 'offer.bebe.com', isActive: true, scope: 'landing_page', builderPageId: 'p2' },
  ];
  it('three tabs: store links, custom domains (pending first), landing-page links', () => {
    const g = groupDomains(list);
    expect(g.store.map((d) => d.id)).toEqual(['store', 'store2']);
    expect(g.custom.map((d) => d.id)).toEqual(['custom-wait', 'custom-ok']);
    expect(g.pages.map((d) => d.id)).toEqual(['lp-sub', 'lp-custom']);
  });
});

describe('DNS_RECORD', () => {
  it('has the four fields the registrar asks for', () => {
    expect(DNS_RECORD).toEqual([['type', 'CNAME'], ['host', '@'], ['value', 'mdstore.top'], ['ttl', 'Auto']]);
  });
});
