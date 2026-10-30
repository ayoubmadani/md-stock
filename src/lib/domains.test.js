import { describe, expect, it } from 'vitest';
import { groupDomains, filterDomains, suggestSubdomain, DNS_RECORD } from './domains';

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

describe('filterDomains', () => {
  const list = [
    { id: 'a', domain: 'b4.mdstore.top', builderPageId: 'p1' },
    { id: 'b', domain: 'coussin.mdstore.top' },
    { id: 'c', domain: 'bebe-shop.com' },
  ];
  const pages = [{ id: 'p1', name: 'وسادة الرضيع' }];
  it('matches the domain or its landing page name, ignoring case and spaces', () => {
    expect(filterDomains(list, ' COUSSIN ', pages).map((d) => d.id)).toEqual(['b']);
    expect(filterDomains(list, 'وسادة', pages).map((d) => d.id)).toEqual(['a']);
    expect(filterDomains(list, '', pages)).toBe(list);
  });
});

describe('suggestSubdomain', () => {
  it('completes a bare name or a partly typed ending with .mdstore.top', () => {
    expect(suggestSubdomain('promo')).toBe('promo.mdstore.top');
    expect(suggestSubdomain(' Promo Shop ')).toBe('promo-shop.mdstore.top');
    expect(suggestSubdomain('https://promo')).toBe('promo.mdstore.top');
    expect(suggestSubdomain('promo.')).toBe('promo.mdstore.top');
    expect(suggestSubdomain('promo.mdst')).toBe('promo.mdstore.top');
  });
  it('no suggestion for a full domain, a finished subdomain or an empty field', () => {
    expect(suggestSubdomain('bebe.com')).toBeNull();
    expect(suggestSubdomain('promo.mdstore.top')).toBeNull();
    expect(suggestSubdomain('')).toBeNull();
    expect(suggestSubdomain('---')).toBeNull();
  });
});
