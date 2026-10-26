// منتج سريع (من المحل): صورة + اسم + سعر + كمية + باركود. منتج عادي افتراضياً،
// ويصبح بنسخ تلقائياً عند إضافة خيار (مقاس، لون، أو أي خيار يكتبه التاجر) — نفس جسم نموذج المنتج
import { newAttribute, newValue, productPayload } from './product-form';

/** الخيارات التي لها قيم فقط ← خصائص (الخادم يولّد النسخ) */
export const quickAttributes = (attrs = []) => attrs
  .filter((a) => a.values.length)
  .map((a) => ({ ...newAttribute('text', a.name.trim()), ...(a.kind === 'size' && { type: 'size' }), variants: a.values.map(newValue) }));

export function quickErrors(f) {
  const errs = [];
  if (!String(f.name || '').trim()) errs.push('name');
  if (!(Number(f.price) > 0)) errs.push('price');
  if ((f.attrs || []).some((a) => a.values.length && !a.name.trim())) errs.push('attr_name');
  return errs;
}

export function quickProductBody(f) {
  const attributes = quickAttributes(f.attrs);
  return productPayload(
    // بنسخ: باركود كل نسخة على حدة، لا باركود للمنتج
    { name: f.name, price: f.price, priceOriginal: '', desc: '', barcode: attributes.length ? '' : f.barcode, stock: f.stock, isActive: true },
    { attributes, offers: [], images: f.image ? [f.image] : [] },
  );
}

/** كل التركيبات بترتيب الخيارات (كما يولّدها الخادم) — قوائم القيم الفارغة تُتجاهل */
export function combos(lists) {
  const used = lists.filter((l) => l.length);
  if (!used.length) return [];
  return used.reduce((acc, list) => acc.flatMap((a) => list.map((v) => [...a, v])), [[]])
    .map((values) => ({ key: values.join('|'), label: values.join(' · '), values }));
}

/** مفتاح نسخة الخادم: قيمها بالترتيب (شكل جديد [{value}] أو قديم {اسم: قيمة}) */
export const variantKey = (v) => (Array.isArray(v.name) ? v.name.map((a) => a.value) : Object.values(v.name || {})).join('|');

/** بعد الإنشاء: كمية/باركود كل نسخة كُتب لها شيء */
export function variantUpdates(serverVariants, rows) {
  return serverVariants.flatMap((v) => {
    const r = rows[variantKey(v)];
    if (!r) return [];
    const stock = Number(r.qty) > 0 ? Number(r.qty) : undefined;
    const barcode = String(r.barcode || '').trim() || undefined;
    if (stock === undefined && !barcode) return [];
    return [{ variantId: v.id, ...(stock !== undefined && { stock }), ...(barcode && { barcode }) }];
  });
}
