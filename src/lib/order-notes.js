// ملاحظات الطلب: أسباب جاهزة (نفس الخادم) ومتى يُعرض السبب (اختياري دائماً)
export const REASONS = ['phone_off', 'no_answer', 'changed_mind', 'price', 'wrong_number', 'delay', 'duplicate', 'other'];

const REASON_STATUSES = new Set(['cancelled', 'returned', 'postponed', 'appl1', 'appl2', 'appl3']);
export const asksReason = (status) => REASON_STATUSES.has(status);

/** جسم POST /orders/:id/notes — null إن لم يُختر سبب ولم يُكتب نص (تخطٍّ) */
export function noteBody({ from, to, reason, text }) {
  const clean = String(text ?? '').trim();
  if (!reason && !clean) return null;
  return {
    ...(from ? { fromStatus: from } : {}),
    ...(to ? { toStatus: to } : {}),
    ...(reason ? { reason } : {}),
    ...(clean ? { text: clean } : {}),
  };
}
