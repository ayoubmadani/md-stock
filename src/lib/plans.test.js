import { describe, expect, it } from 'vitest';
import { daysLeft, discounted, isFree, perMonth, planPrice, upgradeable, yearlySaving } from './plans';

const free = { id: 'f', monthlyPrice: '0', yearlyPrice: '0' };
const basic = { id: 'b', monthlyPrice: '1500.00', yearlyPrice: '15000.00' };
const pro = { id: 'p', monthlyPrice: '3500.00', yearlyPrice: '35000.00' };

describe('plan prices', () => {
  it('price by interval, monthly equivalent of yearly, free plan', () => {
    expect(planPrice(pro, 'year')).toBe(35000);
    expect(perMonth(35000, 'year')).toBe(2917);
    expect(isFree(free)).toBe(true);
    expect(isFree(basic)).toBe(false);
  });
  it('yearly saving percent', () => expect(yearlySaving(pro)).toBe(17));
  it('coupon: percentage, fixed, never below 0', () => {
    expect(discounted(1000, { discountType: 'percentage', discountValue: '10' })).toBe(900);
    expect(discounted(1000, { discountType: 'fixed', discountValue: 300 })).toBe(700);
    expect(discounted(1000, { discountType: 'fixed', discountValue: 5000 })).toBe(0);
    expect(discounted(1000, null)).toBe(1000);
  });
});

describe('upgradeable', () => {
  const plans = [free, basic, pro];
  it('no subscription → every paid plan', () => expect(upgradeable(plans, null).map((p) => p.id)).toEqual(['b', 'p']));
  it('on basic → only more expensive plans', () => expect(upgradeable(plans, { plan: basic }).map((p) => p.id)).toEqual(['p']));
  it('during a trial → any paid plan, including the trial plan', () => expect(upgradeable(plans, { plan: pro, isTrial: true }).map((p) => p.id)).toEqual(['b', 'p']));
});

it('daysLeft never negative', () => {
  const now = new Date('2026-10-26T12:00:00Z');
  expect(daysLeft('2026-11-05T12:00:00Z', now)).toBe(10);
  expect(daysLeft('2026-10-01T00:00:00Z', now)).toBe(0);
});
