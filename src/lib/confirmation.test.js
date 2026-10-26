import { describe, expect, it } from 'vitest';
import { confirmStats } from './confirmation';

describe('confirmStats', () => {
  it('groups a company order counts like the dashboard', () => {
    expect(confirmStats({ pending: 2, appl1: 1, postponed: 1, confirmed: 3, shipping: 1, delivered: 5, cancelled: 1, returned: 2 }))
      .toEqual({ waiting: 4, confirmed: 4, delivered: 5, cancelled: 3 });
  });
  it('no orders → zeros', () => expect(confirmStats(undefined)).toEqual({ waiting: 0, confirmed: 0, delivered: 0, cancelled: 0 }));
});
