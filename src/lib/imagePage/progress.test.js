import { describe, it, expect } from 'vitest';
import { progressFor } from './progress';

describe('progressFor', () => {
  it('stays inside each step range and never reaches the next one by time alone', () => {
    expect(progressFor({ step: 'cutout', elapsedMs: 0 })).toBe(0);
    expect(progressFor({ step: 'cutout', elapsedMs: 10 * 60_000 })).toBeLessThan(25);
    expect(progressFor({ step: 'palette', elapsedMs: 0 })).toBe(25);
    expect(progressFor({ step: 'design', elapsedMs: 0 })).toBe(30);
    const d = progressFor({ step: 'design', elapsedMs: 40_000 });
    expect(d).toBeGreaterThan(50);
    expect(progressFor({ step: 'design', elapsedMs: 10 * 60_000 })).toBeLessThan(75);
  });

  it('capture is exact by captured sections, upload near the end', () => {
    expect(progressFor({ step: 'capture', captured: 0, count: 4 })).toBe(75);
    expect(progressFor({ step: 'capture', captured: 2, count: 4 })).toBe(85);
    expect(progressFor({ step: 'upload' })).toBe(95);
  });

  it('is monotonic within design', () => {
    expect(progressFor({ step: 'design', elapsedMs: 20_000 })).toBeLessThan(progressFor({ step: 'design', elapsedMs: 30_000 }));
  });
});
