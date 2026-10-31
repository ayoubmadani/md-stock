import { describe, it, expect } from 'vitest';
import { keyboardState } from './keyboard';

describe('keyboardState', () => {
  it('keyboard closed: visible area equals the window', () => {
    expect(keyboardState(844, { height: 844, offsetTop: 0 })).toEqual({ open: false, height: 844, top: 0 });
  });

  it('keyboard open (iPhone): visible area shrinks, modals take its height and offset', () => {
    expect(keyboardState(844, { height: 508, offsetTop: 0 })).toEqual({ open: true, height: 508, top: 0 });
    expect(keyboardState(844, { height: 508, offsetTop: 120 })).toEqual({ open: true, height: 508, top: 120 });
  });

  it('small changes (address bar, zoom bar) are not a keyboard', () => {
    expect(keyboardState(844, { height: 780, offsetTop: 0 }).open).toBe(false);
  });

  it('no visualViewport support: treated as closed', () => {
    expect(keyboardState(844, null)).toEqual({ open: false, height: 844, top: 0 });
  });
});
