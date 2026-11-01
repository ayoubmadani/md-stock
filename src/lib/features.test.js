import { describe, it, expect } from 'vitest';
import { FEATURES } from './features';
import { MORE } from '../pages/More';

describe('feature switches', () => {
  it('Meta ads are hidden for now (to be added later)', () => {
    expect(FEATURES.metaAds).toBe(false);
    expect(MORE.some((m) => m.to === '/meta')).toBe(false);
  });
});
