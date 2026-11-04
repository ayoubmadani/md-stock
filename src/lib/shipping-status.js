// حالة الطرد عند شركة التوصيل (shippingStatus يحسبه الـ API من نص الشركة) — لون كل حالة
// failed_delivery هي الأهم: الاتصال بالزبون الآن يُنقذ الطرد قبل أن يرجع

const TONE = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300',
  picked_up: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  in_transit: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  out_for_delivery: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  ready_for_pickup: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  failed_delivery: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  returning: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  returned: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  exception: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
  unknown: 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300',
};

/** حالة الطرد للعرض، أو null إن لم تُرسل الشركة حالة بعد. urgent = يجب الاتصال بالزبون */
export function shipStatusInfo(order) {
  const code = order?.shippingStatus;
  if (!code) return null;
  const known = Object.prototype.hasOwnProperty.call(TONE, code) ? code : 'unknown';
  return { code: known, tone: TONE[known], urgent: known === 'failed_delivery', raw: order.shippingProviderStatus || '' };
}
