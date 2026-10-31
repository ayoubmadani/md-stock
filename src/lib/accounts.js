// عدة حسابات على نفس الهاتف: القائمة في stock_accounts، والحساب الحالي يبقى في stock_token كما كان.
// التبديل = نسخ رمز الحساب المختار إلى stock_token — باقي التطبيق لا يتغير.
// الإشعارات تتبع الحساب الحالي: /push/subscribe ينقل اشتراك هذا الهاتف إلى صاحب الرمز.

export const MAX_ACCOUNTS = 5;
const KEY = 'stock_accounts';

export function readAccounts() {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function writeAccounts(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* وضع خاص */ }
}

/** معرّف المستخدم (sub) من رمز JWT، أو null */
export function tokenUserId(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json)?.sub ?? null;
  } catch {
    return null;
  }
}

/** حساب جديد يُضاف في الآخر؛ نفس الحساب يُحدَّث في مكانه (رمز جديد، لم يعد منتهياً، يبقى آخر متجر) */
export function upsertAccount(list, account) {
  const i = list.findIndex((a) => a.id === account.id);
  if (i < 0) return [...list, { storeId: null, ...account, expired: false }];
  return list.map((a, k) => (k === i ? { ...a, ...account, storeId: account.storeId ?? a.storeId, expired: false } : a));
}

export const removeAccount = (list, id) => list.filter((a) => a.id !== id);
export const markExpired = (list, id) => list.map((a) => (a.id === id ? { ...a, expired: true } : a));
export const setAccountStore = (list, id, storeId) => list.map((a) => (a.id === id ? { ...a, storeId } : a));

/** الحساب التالي الذي ما زالت جلسته صالحة (بعد الخروج من الحالي)، أو null */
export const nextAccount = (list, excludeId) => list.find((a) => a.id !== excludeId && !a.expired) ?? null;

export const canAddAccount = (list) => list.length < MAX_ACCOUNTS;
