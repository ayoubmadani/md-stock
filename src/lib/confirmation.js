// شركات التأكيد: تجميع حالات طلبات المتجر عند الشركة (نفس اللوحة)
const GROUPS = {
  waiting: ['pending', 'appl1', 'appl2', 'appl3', 'postponed'],
  confirmed: ['confirmed', 'shipping'],
  delivered: ['delivered'],
  cancelled: ['cancelled', 'returned'],
};

export const confirmStats = (orders = {}) =>
  Object.fromEntries(Object.entries(GROUPS).map(([k, keys]) => [k, keys.reduce((s, x) => s + Number(orders?.[x] || 0), 0)]));
