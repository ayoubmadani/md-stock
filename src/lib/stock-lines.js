// شكل موحّد لكل المنتجات في صفحة المخزون: أسطر مخزون
// منتج بلا نسخ = سطر واحد هو المنتج نفسه؛ منتج بنسخ = سطر لكل نسخة (لا شيء يتغيّر في البيانات)
export const stockLines = (p) => (p.variants?.length
  ? p.variants.map((v) => ({ key: v.id, variantId: v.id, parts: v.parts, stock: v.stock, status: v.status }))
  : [{ key: p.id, variantId: null, parts: null, stock: p.stock, status: p.status }]);
