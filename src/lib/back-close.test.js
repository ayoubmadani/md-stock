// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { closeTopOverlay, openOverlays } from './back-close';

const overlay = (html, onBackdrop) => {
  const el = document.createElement('div');
  el.className = 'fixed inset-0 z-50 bg-black/50';
  el.innerHTML = html;
  if (onBackdrop) el.addEventListener('click', (e) => { if (e.target === e.currentTarget) onBackdrop(); });
  document.body.appendChild(el);
  return el;
};

afterEach(() => { document.body.innerHTML = ''; });

describe('phone back button closes the open window', () => {
  it('finds the open windows, top one last', () => {
    const a = overlay('<p>a</p>');
    const b = overlay('<p>b</p>');
    document.body.appendChild(Object.assign(document.createElement('div'), { className: 'fixed top-0' }));
    expect(openOverlays(document)).toEqual([a, b]);
  });

  it('closes the top window through its backdrop', () => {
    const first = vi.fn();
    const top = vi.fn();
    overlay('<p>a</p>', first);
    overlay('<p>b</p>', top);
    expect(closeTopOverlay(document)).toBe(true);
    expect(top).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('a window without a backdrop close uses its X button', () => {
    const x = vi.fn();
    const el = overlay('<button><svg class="lucide lucide-x"></svg></button>');
    el.querySelector('button').addEventListener('click', x);
    // الخلفية لا تُغلقها ← بعد النقر تبقى، فيُضغط زر X
    closeTopOverlay(document, { stillOpen: () => true });
    expect(x).toHaveBeenCalledTimes(1);
  });

  it('nothing open: nothing to close', () => {
    expect(closeTopOverlay(document)).toBe(false);
  });
});
