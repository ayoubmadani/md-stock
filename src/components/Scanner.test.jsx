import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const start = vi.fn();
const stop = vi.fn();
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class { decodeFromConstraints(...a) { start(...a); return Promise.resolve({ stop }); } },
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

const { default: Scanner } = await import('./Scanner.jsx');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Scanner camera', () => {
  let root; let el;
  beforeEach(() => { vi.useFakeTimers(); start.mockClear(); stop.mockClear(); el = document.createElement('div'); root = createRoot(el); });
  afterEach(() => { act(() => root.unmount()); vi.useRealTimers(); });

  it('opens the camera once even when React mounts it twice (dev StrictMode)', async () => {
    await act(async () => { root.render(<StrictMode><Scanner onDetected={() => {}} /></StrictMode>); });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('does not restart the camera when the parent re-renders with a new callback', async () => {
    await act(async () => { root.render(<Scanner onDetected={() => {}} />); });
    await act(async () => { vi.advanceTimersByTime(500); });
    await act(async () => { root.render(<Scanner onDetected={() => {}} />); });
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });
});
