// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { hideSplash, splashVisible } from './splash';

const mount = () => { document.body.innerHTML = '<div id="splash"></div><div id="root"></div>'; return document.getElementById('splash'); };

describe('splash screen', () => {
  it('is visible until the app is ready, then fades out and is removed', () => {
    vi.useFakeTimers();
    const el = mount();
    expect(splashVisible()).toBe(true);
    hideSplash();
    expect(el.classList.contains('splash-out')).toBe(true);
    vi.advanceTimersByTime(400);
    expect(document.getElementById('splash')).toBeNull();
    expect(splashVisible()).toBe(false);
    vi.useRealTimers();
  });

  it('hiding twice or with no splash does nothing', () => {
    mount();
    hideSplash();
    expect(() => hideSplash()).not.toThrow();
    document.body.innerHTML = '';
    expect(() => hideSplash()).not.toThrow();
  });
});
