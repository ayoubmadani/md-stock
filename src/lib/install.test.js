import { describe, it, expect } from 'vitest';
import { installMode } from './install';

const UA = {
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
  facebookAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0]',
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1',
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0',
  desktopChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
};

describe('installMode (install button under the login form)', () => {
  it('already running as the installed app → nothing', () => {
    expect(installMode({ ua: UA.androidChrome, standalone: true, canPrompt: true })).toBe('installed');
  });

  it('Chrome on Android → install button (one tap when Chrome offered it, else the menu steps)', () => {
    expect(installMode({ ua: UA.androidChrome, standalone: false, canPrompt: true })).toBe('prompt');
    expect(installMode({ ua: UA.androidChrome, standalone: false, canPrompt: false })).toBe('android');
  });

  it('Safari on iPhone → install button with the Share steps', () => {
    expect(installMode({ ua: UA.iosSafari, standalone: false, canPrompt: false })).toBe('ios');
  });

  it('other Android browsers (Samsung, Firefox, Facebook in-app) → «open in Google Chrome»', () => {
    for (const ua of [UA.samsung, UA.androidFirefox, UA.facebookAndroid]) {
      expect(installMode({ ua, standalone: false, canPrompt: false })).toBe('open-chrome');
    }
    // حتى لو أعطى المتصفح الآخر حدث تثبيت: المطلوب Chrome فقط
    expect(installMode({ ua: UA.samsung, standalone: false, canPrompt: true })).toBe('open-chrome');
  });

  it('other iPhone browsers (Chrome, Instagram in-app) → «open in Safari»', () => {
    expect(installMode({ ua: UA.iosChrome, standalone: false, canPrompt: false })).toBe('open-safari');
    expect(installMode({ ua: UA.instagramIos, standalone: false, canPrompt: false })).toBe('open-safari');
  });

  it('computer → nothing', () => {
    expect(installMode({ ua: UA.desktopChrome, standalone: false, canPrompt: true })).toBe('none');
  });
});
