// تعديل الصور قبل الرفع (شعار، أيقونة، منتجات): قص يدوي + إزالة الخلفية البيضاء (دوال خالصة، الرسم في ImageEditor)

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

/** سحب إطار القص (move أو زاوية nw/ne/sw/se) بمقدار dx/dy داخل صورة W×H؛ ratio (عرض/ارتفاع) يثبّت الشكل */
export function dragRect(r, handle, dx, dy, W, H, ratio) {
  if (handle === 'move') return { ...r, x: clamp(r.x + dx, 0, W - r.w), y: clamp(r.y + dy, 0, H - r.h) };
  let { x, y, w, h } = r;
  if (handle.includes('w')) { const right = x + w; x = clamp(x + dx, 0, right - MIN_CROP); w = right - x; }
  if (handle.includes('e')) w = clamp(w + dx, MIN_CROP, W - x);
  if (handle.includes('n')) { const bottom = y + h; y = clamp(y + dy, 0, bottom - MIN_CROP); h = bottom - y; }
  if (handle.includes('s')) h = clamp(h + dy, MIN_CROP, H - y);
  if (!ratio) return { x, y, w, h };
  // الشكل الثابت: يتبع البعد الذي سُحب أكثر، ويثبت الركن المقابل
  const right = r.x + r.w, bottom = r.y + r.h;
  const roomW = handle.includes('w') ? right : W - r.x;
  const roomH = handle.includes('n') ? bottom : H - r.y;
  const byW = Math.abs(w - r.w) >= Math.abs(h - r.h) * ratio;
  const nw = Math.round(clamp(byW ? w : h * ratio, MIN_CROP, Math.min(roomW, roomH * ratio)));
  const nh = Math.round(nw / ratio);
  return { x: handle.includes('w') ? right - nw : r.x, y: handle.includes('n') ? bottom - nh : r.y, w: nw, h: nh };
}

/** أكبر إطار في الوسط بالنسبة ratio (أو الصورة كلها بدونها) */
export function fitRect(W, H, ratio) {
  if (!ratio) return { x: 0, y: 0, w: W, h: H };
  const w = Math.round(Math.min(W, H * ratio));
  const h = Math.round(w / ratio);
  return { x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), w, h };
}
