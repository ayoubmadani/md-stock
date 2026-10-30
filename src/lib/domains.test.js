import { describe, expect, it } from 'vitest';
import { splitDomains, DNS_RECORD } from './domains';

describe('splitDomains', () => {
  it('the store link (*.mdstore.top) apart from the custom domains, pending ones first', () => {
    const list = [
      { id: 'a', domain: 'promo.bebe.com', isActive: true },
      { id: 'b', domain: 'bebe.mdstore.top', isActive: true },
      { id: 'c', domain: 'bebe.com', isActive: false },
    ];
    const { system, custom } = splitDomains(list);
    expect(system.map((d) => d.id)).toEqual(['b']);
    expect(custom.map((d) => d.id)).toEqual(['c', 'a']);
  });
});

describe('splitDomains — landing-page links', () => {
  it('a landing-page subdomain (*.mdstore.top) is not the store link: it goes with the deletable domains', () => {
    const list = [
      { id: 'store', domain: 'bebe.mdstore.top', isActive: true, scope: 'store' },
      { id: 'lp', domain: 'promo.mdstore.top', isActive: true, scope: 'landing_page' },
    ];
    const { system, custom } = splitDomains(list);
    expect(system.map((d) => d.id)).toEqual(['store']);
    expect(custom.map((d) => d.id)).toEqual(['lp']);
  });
});

describe('DNS_RECORD', () => {
  it('has the four fields the registrar asks for', () => {
    expect(DNS_RECORD).toEqual([['type', 'CNAME'], ['host', '@'], ['value', 'mdstore.top'], ['ttl', 'Auto']]);
  });
});
