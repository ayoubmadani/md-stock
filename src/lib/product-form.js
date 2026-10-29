// منطق نموذج المنتج — نفس شكل البيانات الذي ترسله لوحة التاجر

const DEFAULT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
let seq = 0;
const uid = (p) => `${p}-${Date.now()}-${++seq}`;

/** خاصية جديدة: المقاس يبدأ بالمقاسات المعتادة، اللون بوضع «لون» */
export function newAttribute(type, name) {
  const base = { id: uid('att'), type, name };
  if (type === 'color') return { ...base, displayMode: 'color', variants: [] };
  if (type === 'size') return { ...base, variants: DEFAULT_SIZES.map((s) => ({ id: uid('var'), name: s, value: s })) };
  return { ...base, variants: [] };
}

export const newValue = (value) => ({ id: uid('var'), name: value, value });
export const newOffer = () => ({ id: uid('off'), name: '', subTitle: '', quantity: '', price: '', shippingFree: false });

/** تحريك عنصر خطوة (−1 / +1) داخل القائمة */
export function moveItem(list, index, step) {
  const to = index + step;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

/** جسم POST/PATCH المنتج. النسخ يولّدها الخادم من الخصائص ويحافظ على سعر وكمية الموجود منها */
export function productPayload(form, { attributes, offers, images }) {
  const num = (v) => (v === '' || v == null ? null : Number(v));
  const out = {
    name: form.name.trim(),
    price: Number(form.price),
    priceOriginal: num(form.priceOriginal),
    desc: form.desc || '',
    categoryId: form.categoryId || null,
    shippingFree: !!form.shippingFree,
    isDigital: !!form.isDigital,
    isActive: form.isActive !== false,
    barcode: form.barcode?.trim() || null,
    attributes,
    variantDetails: [],
    offers: offers.map((o) => ({ id: o.id, name: o.name.trim(), subTitle: o.subTitle?.trim() || '', quantity: Number(o.quantity) || 0, price: Number(o.price) || 0, shippingFree: !!o.shippingFree })),
    images,
  };
  if (!attributes.length) out.stock = Number(form.stock) || 0;
  return out;
}

/** مفاتيح الأخطاء (ترجمة) بالترتيب */
export function validateProduct(form, { attributes, offers }) {
  const errs = [];
  if (!/[a-zA-Z0-9؀-ۿ]/.test(form.name || '')) errs.push('name');
  if (!(Number(form.price) > 0)) errs.push('price');
  const counts = {};
  for (const a of attributes) { const k = a.name?.trim().toLowerCase(); if (k) counts[k] = (counts[k] || 0) + 1; }
  if (attributes.some((a) => !a.variants.length || a.variants.some((v) => !String(v.value || '').trim()))) errs.push('attr_empty');
  if (Object.values(counts).some((n) => n > 1)) errs.push('attr_duplicate');
  if (attributes.some((a) => !a.name?.trim())) errs.push('attr_name');
  if (offers.some((o) => !o.name?.trim() || !(Number(o.quantity) > 0) || !(Number(o.price) > 0))) errs.push('offer');
  return errs;
}

// سعر النسخة: -1 (يولّده الخادم) = سعر المنتج — يظهر الحقل فارغاً وسعر المنتج كتلميح
export const variantPriceField = (price) => (Number(price) < 0 ? '' : String(price ?? ''));
export const effectiveVariantPrice = (price, productPrice) => (price === '' || price == null || Number(price) < 0 ? Number(productPrice) : Number(price));

/** ربط قيمة (لون) بصورة من صور المنتج، أو إزالة الربط (url = null) */
export const linkVariantImage = (attr, variantId, url) => ({
  ...attr,
  variants: attr.variants.map((v) => (v.id === variantId ? { ...v, imageUrl: url || null } : v)),
});

/** صورة حُذفت من المنتج لا تبقى مربوطة بلون (نفس المرجع إن لم يتغير شيء) */
export function pruneVariantImages(attributes, images) {
  const stale = (v) => v.imageUrl && !images.includes(v.imageUrl);
  if (!attributes.some((a) => a.variants.some(stale))) return attributes;
  return attributes.map((a) => ({ ...a, variants: a.variants.map((v) => (stale(v) ? { ...v, imageUrl: null } : v)) }));
}

/** ألوان جاهزة لنافذة اختيار اللون: كل سطر درجات لون واحد (فاتح → غامق) */
export const COLOR_PALETTE = [
  ['#ffffff', '#e5e7eb', '#9ca3af', '#4b5563', '#000000'],
  ['#fecaca', '#f87171', '#ef4444', '#b91c1c', '#7f1d1d'],
  ['#fed7aa', '#fb923c', '#f97316', '#c2410c', '#7c2d12'],
  ['#fef08a', '#facc15', '#eab308', '#a16207', '#713f12'],
  ['#bbf7d0', '#4ade80', '#22c55e', '#15803d', '#14532d'],
  ['#a5f3fc', '#22d3ee', '#06b6d4', '#0e7490', '#164e63'],
  ['#bfdbfe', '#60a5fa', '#3b82f6', '#1d4ed8', '#1e3a8a'],
  ['#ddd6fe', '#a78bfa', '#8b5cf6', '#6d28d9', '#4c1d95'],
  ['#fbcfe8', '#f472b6', '#ec4899', '#be185d', '#831843'],
  ['#f5e6d3', '#d4a373', '#a47148', '#7f5539', '#4a2c1a'],
];

/** تعديل قيمة (لون) مع إبقاء معرّفها وصورتها المربوطة؛ null إن كانت القيمة الجديدة لقيمة أخرى */
export function replaceValue(attr, id, value) {
  if (attr.variants.some((v) => v.id !== id && v.value === value)) return null;
  return { ...attr, variants: attr.variants.map((v) => (v.id === id ? { ...v, name: value, value } : v)) };
}

/** إضافة عدة قيم دفعة واحدة (مثلاً ألوان من النافذة)، بلا تكرار */
export function addValues(attr, values) {
  const seen = new Set(attr.variants.map((v) => v.value));
  const fresh = values.filter((v) => !seen.has(v) && seen.add(v));
  return { ...attr, variants: [...attr.variants, ...fresh.map(newValue)] };
}
