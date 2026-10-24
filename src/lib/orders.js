// قواعد الطلبات كما في لوحة التاجر: الحالات، قفل شركة التأكيد، وجسم طلب تغيير الحالة.

export const STATUSES = ['pending', 'appl1', 'appl2', 'appl3', 'postponed', 'confirmed', 'shipping', 'delivered', 'returned', 'cancelled'];

export const STATUS_CLS = {
  pending: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
  appl1: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400',
  appl2: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400',
  appl3: 'text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400',
  confirmed: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400',
  shipping: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10 dark:text-cyan-400',
  cancelled: 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400',
  returned: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400',
  delivered: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400',
  postponed: 'text-gray-500 bg-gray-100 dark:bg-zinc-800 dark:text-zinc-400',
};

export const STATUS_DOT = {
  pending: 'bg-amber-500', appl1: 'bg-orange-500', appl2: 'bg-orange-500', appl3: 'bg-orange-500',
  confirmed: 'bg-blue-500', shipping: 'bg-cyan-500', cancelled: 'bg-purple-500',
  returned: 'bg-rose-500', delivered: 'bg-emerald-500', postponed: 'bg-gray-400',
};

const AFTER_CONFIRMATION = ['confirmed', 'shipping', 'delivered', 'returned'];
const DIGITAL_HIDDEN = ['shipping', 'returned'];

/** الحالات التي يستطيع التاجر اختيارها لهذا الطلب ([] = الطلب عند شركة التأكيد) */
export function allowedStatuses(order) {
  if (order.confirmationCompanyId) {
    if (!AFTER_CONFIRMATION.includes(order.status)) return [];
    // بعد تأكيد الشركة: التسليم والإرجاع يأتيان من شركة التوصيل، التاجر يضع «قيد الشحن» فقط
    return STATUSES.filter((s) => s === order.status || s === 'shipping');
  }
  return order.isDigital ? STATUSES.filter((s) => !DIGITAL_HIDDEN.includes(s)) : STATUSES;
}

/** نفس جسم PATCH /orders/:id الذي ترسله اللوحة: عنصر لكل منتج في الطلب */
export const statusPayload = (order, status) => (order.items || []).map((item) => ({
  status,
  productId: item.productId || item.product?.id,
  quantity: item.quantity,
  variantDetailId: item.variantDetailId ?? null,
  offerId: item.offerId ?? null,
  finalPrice: item.finalPrice,
  totalPrice: (item.finalPrice || 0) * (item.quantity || 1),
}));

/** رابط واتساب: الرقم المحلي (0…) يصبح 213… */
export function whatsappLink(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const intl = digits.startsWith('213') ? digits : digits.startsWith('0') ? `213${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

/** [{status, count}] من الخادم → { pending: 3, …, all: المجموع } */
export function sumCounts(rows) {
  const out = { all: 0 };
  for (const r of rows || []) {
    const n = Number(r.count) || 0;
    out[r.status] = n;
    out.all += n;
  }
  return out;
}

export const money = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const WAITING = ['pending', 'appl1', 'appl2', 'appl3', 'postponed'];

/**
 * «الخطوة التالية» بعد مسح طلب: أزرار حسب الحالة، بنفس قفل شركة التأكيد.
 * { status } = تغيير الحالة، { action: 'ship' } = رفع لشركة التوصيل. الأول هو الأساسي.
 */
export function nextActions(order) {
  const allowed = allowedStatuses(order);
  const st = (s) => (allowed.includes(s) ? [{ status: s }] : []);
  if (WAITING.includes(order.status)) return [...st('confirmed'), ...st('cancelled')];
  if (order.status === 'confirmed') {
    if (order.isDigital) return st('delivered');
    return [...(order.shippingTrackingId ? [] : [{ action: 'ship' }]), ...st('shipping')];
  }
  if (order.status === 'shipping') return [...st('delivered'), ...st('returned')];
  return [];
}
