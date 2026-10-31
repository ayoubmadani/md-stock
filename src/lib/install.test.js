import { describe, it, expect } from 'vitest';
import { installMode } from './install';

describe('installMode (install button under the login form)', () => {
  it('already running as the installed app → no button', () => {
    expect(installMode({ standalone: true, ios: false, canPrompt: true })).toBe('installed');
    expect(installMode({ standalone: true, ios: true, canPrompt: false })).toBe('installed');
  });
  it('Android / Chrome / Edge: the browser offered an install → one-tap install', () => {
    expect(installMode({ standalone: false, ios: false, canPrompt: true })).toBe('prompt');
  });
  it('iPhone / iPad Safari: no install API → show the «Share → Add to Home Screen» steps', () => {
    expect(installMode({ standalone: false, ios: true, canPrompt: false })).toBe('ios');
  });
  it('browser that cannot install → hidden', () => {
    expect(installMode({ standalone: false, ios: false, canPrompt: false })).toBe('none');
  });
});
