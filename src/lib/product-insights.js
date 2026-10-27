// إحصائيات المنتج — نفس حساب صفحة المنتج في اللوحة (products/Show.jsx)

/** حسب الخاصية ثم القيمة: { Color: [{ value, total, activeCount, orders, units, revenue }] } — الأكثر مبيعاً أولاً */
export function valueGroups(variants) {
  const groups = {};
  for (const v of variants || []) {
    for (const e of v.name || []) {
      const list = (groups[e.attrName] ||= []);
      let g = list.find((x) => x.value === e.value);
      if (!g) {
        g = { attrName: e.attrName, value: e.value, displayMode: e.displayMode, total: 0, activeCount: 0, orders: 0, units: 0, revenue: 0 };
        list.push(g);
      }
      g.total += 1;
      g.activeCount += v.isActive ? 1 : 0;
      g.orders += v.orders;
      g.units += v.units;
      g.revenue += v.revenue;
    }
  }
  Object.values(groups).forEach((list) => list.sort((a, b) => b.units - a.units || b.orders - a.orders));
  return groups;
}

/** ارتفاع عمود كل يوم بالنسبة لأكثر يوم طلبات (٪) */
export function barHeights(daily) {
  const max = Math.max(0, ...(daily || []).map((d) => Number(d.orders) || 0));
  return (daily || []).map((d) => (max ? Math.round(((Number(d.orders) || 0) / max) * 100) : 0));
}
