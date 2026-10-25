import { describe, expect, it } from 'vitest';
import { campaignsFor } from './campaign-links';

const list = [
  { campaignId: 'a', productId: 'p2', spend: 9 },
  { campaignId: 'b', productId: null, spend: 1 },
  { campaignId: 'c', productId: 'p1', spend: 0 },
  { campaignId: 'd', productId: null, spend: 5 },
];

describe('campaignsFor', () => {
  it('marks each campaign: linked here, free, or linked to another product', () => {
    expect(campaignsFor(list, 'p1').map((c) => [c.campaignId, c.link])).toEqual([['c', 'here'], ['d', 'free'], ['b', 'free'], ['a', 'other']]);
  });
  it('handles an empty list', () => expect(campaignsFor(null, 'p1')).toEqual([]));
});
