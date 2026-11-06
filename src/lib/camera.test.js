import { describe, expect, it, vi } from 'vitest';
import { applyZoom } from './camera';

const track = (zoom) => ({ getCapabilities: () => (zoom ? { zoom } : {}), applyConstraints: vi.fn(async () => {}) });

describe('applyZoom — x2 so the label is big while the phone stays far enough to focus', () => {
  it('applies 2 when the camera allows it', async () => {
    const t = track({ min: 1, max: 10 });
    expect(await applyZoom(t)).toBe(2);
    expect(t.applyConstraints).toHaveBeenCalledWith({ advanced: [{ zoom: 2 }] });
  });
  it('stays inside the camera range', async () => {
    expect(await applyZoom(track({ min: 1, max: 1.5 }))).toBe(1.5);
  });
  it('no zoom support (iPhone Safari), no track, or a refusal → nothing, no error', async () => {
    expect(await applyZoom(track(null))).toBeNull();
    expect(await applyZoom(null)).toBeNull();
    const t = track({ min: 1, max: 10 }); t.applyConstraints.mockRejectedValue(new Error('OverconstrainedError'));
    expect(await applyZoom(t)).toBeNull();
  });
});
