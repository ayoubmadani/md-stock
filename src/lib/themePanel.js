// إطار الثيم المفعّل (صفحة الثيمات): هل يتبع ألوان المتجر؟ وماذا ينقص المتجر ليظهر الثيم جيداً؟

/** دعم الألوان يُقرأ من كود الثيم نفسه: يقرأ primaryColor ← اللون الأساسي، secondaryColor ← الثانوي */
export function themeColorSupport(code) {
  const s = String(code || '');
  return { primary: s.includes('primaryColor'), secondary: s.includes('secondaryColor') };
}

const hasImage = (p) => !!(p?.productImage || p?.imagesProduct?.some?.((i) => i?.imageUrl));

/** نص ملاحظة الأدمن بلغة التاجر */
export const noteText = (n, lang) => (lang?.startsWith('fr') ? n.text_fr : lang?.startsWith('en') ? n.text_en : n.text_ar) || n.text_ar || '';

/** ملاحظات: الشعار، صورة الغلاف، صور المنتجات، الفئات، ثم ملاحظات الأدمن لهذا الثيم (جدول theme_notes) */
export function themeNotes({ store, products = [], productsTotal = 0, categories = [], adminNotes = [], lang }) {
  const noImage = products.filter((p) => !hasImage(p)).length;
  const notes = [
    { key: 'logo', ok: !!store?.design?.logoUrl },
    { key: 'hero', ok: !!store?.hero?.imageUrl },
    { key: 'products', ok: productsTotal > 0 && noImage === 0, count: noImage, empty: productsTotal === 0 },
    { key: 'categories', ok: categories.length > 0 },
  ];
  for (const n of adminNotes) { const text = noteText(n, lang); if (text) notes.push({ key: 'tip', ok: true, text }); }
  return notes;
}

/** ألوان جاهزة في المنتقي */
export const PRESET_COLORS = ['#1D4ED8', '#4F46E5', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#D97706', '#16A34A', '#0D9488', '#0891B2', '#111827'];
