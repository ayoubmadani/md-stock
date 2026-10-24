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
