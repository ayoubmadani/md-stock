// تحديد عدة منتجات في المخزون لتفعيلها أو إيقافها مرة واحدة

export const toggleId = (ids, id) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

/** active | store_off (لا يظهر في المتجر، يُباع في المحل) | off (متوقف مطلقاً) */
export const productState = (p) => (p.isActive !== false ? 'active' : p.isArchived ? 'off' : 'store_off');

/** المنتجات المحددة التي ستتغير حالتها فعلاً */
export const bulkTargets = (rows, ids, state) =>
  rows.filter((p) => ids.includes(p.id) && productState(p) !== state).map((p) => p.id);

/** منتجات البيع في المحل: كل شيء ما عدا المتوقف مطلقاً */
export const posProducts = (list) => list.filter((p) => !p.isArchived);
