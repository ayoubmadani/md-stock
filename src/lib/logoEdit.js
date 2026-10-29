// تعديل الشعار قبل الرفع: قص يدوي + إزالة الخلفية البيضاء (دوال خالصة، الرسم في LogoEditor)

export const MIN_CROP = 16;
const SOFT = 40; // عرض الحافة الناعمة تحت العتبة
const GREY = 24; // أقصى فرق بين القنوات ليُعدّ اللون أبيض/رمادي فاتح

/** يجعل البكسلات البيضاء شفافة (مع حافة ناعمة)؛ يعدّل المصفوفة ويرجعها */
export function removeWhite(data, threshold = 240) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lo = Math.min(r, g, b);
    if (Math.max(r, g, b) - lo > GREY || lo < threshold - SOFT) continue;
    data[i + 3] = lo >= threshold ? 0 : Math.round(data[i + 3] * ((threshold - lo) / SOFT));
  }
  return data;
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/** سحب إطار القص (move أو زاوية nw/ne/sw/se) بمقدار dx/dy داخل صورة W×H */
export function dragRect(r, handle, dx, dy, W, H) {
  if (handle === 'move') return { ...r, x: clamp(r.x + dx, 0, W - r.w), y: clamp(r.y + dy, 0, H - r.h) };
  let { x, y, w, h } = r;
  if (handle.includes('w')) { const right = x + w; x = clamp(x + dx, 0, right - MIN_CROP); w = right - x; }
  if (handle.includes('e')) w = clamp(w + dx, MIN_CROP, W - x);
  if (handle.includes('n')) { const bottom = y + h; y = clamp(y + dy, 0, bottom - MIN_CROP); h = bottom - y; }
  if (handle.includes('s')) h = clamp(h + dy, MIN_CROP, H - y);
  return { x, y, w, h };
}
