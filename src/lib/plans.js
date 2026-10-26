// الخطط والاشتراك — نفس حساب اللوحة (settings/components/utils.js)

export const isFree = (plan) => Number(plan?.monthlyPrice ?? 0) === 0 && Number(plan?.yearlyPrice ?? 0) === 0;
export const planPrice = (plan, interval) => Number(interval === 'year' ? plan?.yearlyPrice ?? 0 : plan?.monthlyPrice ?? 0);
/** السنوي يُعرض بما يعادله شهرياً */
export const perMonth = (amount, interval) => (interval === 'year' ? Math.round(Number(amount) / 12) : Number(amount));
export const yearlySaving = (plan) => (Number(plan.monthlyPrice) > 0 ? Math.round((1 - Number(plan.yearlyPrice) / (Number(plan.monthlyPrice) * 12)) * 100) : 0);

export function discounted(price, coupon) {
  if (!coupon || price <= 0) return price;
  const off = coupon.discountType === 'percentage' ? price * (Number(coupon.discountValue) / 100) : Number(coupon.discountValue);
  return Math.max(0, Number((price - Math.min(off, price)).toFixed(2)));
}

/** بلا اشتراك أو في التجربة: كل خطة مدفوعة — وإلا الأغلى من الحالية فقط */
export function upgradeable(plans, sub) {
  const paid = (plans ?? []).filter((p) => !isFree(p));
  if (!sub || sub.isTrial) return paid;
  const current = planPrice(sub.plan, 'month');
  return paid.filter((p) => p.id !== sub.plan?.id && planPrice(p, 'month') > current);
}

export const daysLeft = (end, now = new Date()) => Math.max(0, Math.ceil((new Date(end) - now) / 86400000));
