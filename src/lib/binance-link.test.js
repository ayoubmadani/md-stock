import { describe, expect, it } from 'vitest';
import { binanceAppUrl } from './binance-link.js';

const link = 'https://app.binance.com/uni-qr/Kg374Tt7';

describe('binanceAppUrl', () => {
  it('Android: an intent link to the Binance app, falling back to the web page', () => {
    expect(binanceAppUrl(link, 'Mozilla/5.0 (Linux; Android 14; SM-A546B) Chrome/130'))
      .toBe(`intent://app.binance.com/uni-qr/Kg374Tt7#Intent;scheme=https;package=com.binance.dev;S.browser_fallback_url=${encodeURIComponent(link)};end`);
  });
  it('iPhone and others: the https link itself (opened in the same page)', () => {
    expect(binanceAppUrl(link, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(link);
  });
  it('keeps the query string', () => {
    expect(binanceAppUrl('https://www.binance.com/my/wallet?x=1', 'Android')).toMatch(/^intent:\/\/www\.binance\.com\/my\/wallet\?x=1#Intent;/);
  });
});
