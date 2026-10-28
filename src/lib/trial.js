const BASE = 'trialOfferDismissed';

/** مفتاح إخفاء عرض التجربة لكل حساب (sub من الـ token) — حتى لا يخفيه حساب سابق على نفس المتصفح */
export function trialDismissKey(token) {
  try {
    const part = String(token).split('.')[1];
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    const id = payload.sub || payload.id;
    return id ? `${BASE}:${id}` : BASE;
  } catch {
    return BASE;
  }
}
