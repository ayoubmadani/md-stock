// شكل موحّد لكل المنتجات في صفحة المخزون: أسطر مخزون
// منتج بلا نسخ = سطر واحد هو المنتج نفسه؛ منتج بنسخ = سطر لكل نسخة (لا شيء يتغيّر في البيانات)
// النافد ثم المنخفض أولاً: سبب حالة المنتج يظهر دون «عرض الكل»
const RANK = { out: 0, low: 1, ok: 2 };

export const stockLines = (p) => (p.variants?.length
  ? p.variants
    .map((v, i) => ({ key: v.id, variantId: v.id, parts: v.parts, stock: v.stock, status: v.status, i }))
    .sort((a, b) => (RANK[a.status] ?? 2) - (RANK[b.status] ?? 2) || a.i - b.i)
    .map(({ i, ...l }) => l) // eslint-disable-line no-unused-vars
  : [{ key: p.id, variantId: null, parts: null, stock: p.stock, status: p.status }]);
