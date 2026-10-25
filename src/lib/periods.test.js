import { describe, expect, it } from 'vitest';
import { periodRange, localDate } from './periods.js';

// 2026-10-25 00:30 في الجزائر = 2026-10-24 23:30 UTC
const now = new Date('2026-10-24T23:30:00Z');

describe('periods (Algeria time)', () => {
  it('today is the Algerian date, not the UTC one', () => {
    expect(localDate(now)).toBe('2026-10-25');
    expect(periodRange('today', now)).toEqual({ from: '2026-10-25', to: '2026-10-25' });
  });
  it('7 and 30 days include today', () => {
    expect(periodRange('7d', now)).toEqual({ from: '2026-10-19', to: '2026-10-25' });
    expect(periodRange('30d', now)).toEqual({ from: '2026-09-26', to: '2026-10-25' });
  });
  it('this month starts on the 1st', () => {
    expect(periodRange('month', now)).toEqual({ from: '2026-10-01', to: '2026-10-25' });
  });
});
