import { describe, expect, it } from 'vitest';
import { pageCr, pageUrl, editorUrl } from './landing-pages';

describe('landing pages', () => {
  it('conversion rate, one decimal, 0 without views', () => {
    expect(pageCr({ showsCount: 18, ordersCount: 2 })).toBe('11.1');
    expect(pageCr({ showsCount: 0, ordersCount: 0 })).toBe('0');
  });
  it('preview link: dedicated domain first, then the /lp link, else none', () => {
    expect(pageUrl({ domains: ['sbox.mdstore.top'], domain: 'a.mdstore.top/lp/x' })).toBe('https://sbox.mdstore.top');
    expect(pageUrl({ domains: [], domain: 'a.mdstore.top/lp/x' })).toBe('https://a.mdstore.top/lp/x');
    expect(pageUrl({ domains: [] })).toBeNull();
  });
  it('editor link in the dashboard', () => expect(editorUrl('p1')).toBe('https://app.mdstore.top/editor/p1'));
});
