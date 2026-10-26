// صلاحيات مجموعات الفريق (نفس اللوحة) — إدارة الطلبات تستلزم عرضها
export const PERMISSIONS = ['store.update', 'product.crud', 'category.crud', 'order.view', 'order.manage', 'domain.crud', 'seo.manage'];

export function togglePerm(list, p) {
  const s = new Set(list);
  if (s.has(p)) {
    if (p === 'order.view' && s.has('order.manage')) return [...s];
    s.delete(p);
  } else {
    s.add(p);
    if (p === 'order.manage') s.add('order.view');
  }
  return [...s];
}
