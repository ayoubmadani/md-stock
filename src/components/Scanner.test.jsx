import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const start = vi.fn();
const made = vi.fn();
const stop = vi.fn();
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class { constructor(...a) { made(...a); } decodeFromConstraints(...a) { start(...a); return Promise.resolve({ stop }); } },
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

  it('reads long dense labels (ZR tracking): high-resolution camera with autofocus, try-harder, Code128 included', async () => {
    const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
    await act(async () => { root.render(<Scanner onDetected={() => {}} />); });
    await act(async () => { vi.advanceTimersByTime(500); });
    const video = start.mock.calls[0][0].video;
    expect(video.width.ideal).toBeGreaterThanOrEqual(1280);
    expect(video.facingMode).toEqual({ ideal: 'environment' });
    const hints = made.mock.calls.at(-1)[0];
    expect(hints.get(DecodeHintType.TRY_HARDER)).toBe(true);
    expect(hints.get(DecodeHintType.POSSIBLE_FORMATS)).toContain(BarcodeFormat.CODE_128);
  });

  it('manual entry accepts letters (delivery tracking like 16-62F3TIA7LQ-ZR), not a digits-only keyboard', async () => {
    await act(async () => { root.render(<Scanner onDetected={() => {}} />); });
    const input = el.querySelector('input');
    expect(input.getAttribute('inputmode')).not.toBe('numeric');
    expect(input.getAttribute('autocapitalize')).toBe('characters');
  });
});
