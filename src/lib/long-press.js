// ضغطة مطوّلة على عنصر (الهاتف والحاسوب): بعد ms تُستدعى onLong، والنقرة التي تليها تُتجاهل.
// تحريك الإصبع (تمرير القائمة) يلغيها. الاستعمال: <button {...longPress({ onLong, onClick })}>
const MOVE_TOLERANCE = 10;

export function longPress({ onLong, onClick, ms = 450 }) {
  let timer = null;
  let fired = false;
  let start = null;
  const cancel = () => { clearTimeout(timer); timer = null; };
  return {
    onPointerDown: (e) => {
      fired = false;
      start = { x: e.clientX, y: e.clientY };
      cancel();
      timer = setTimeout(() => { fired = true; timer = null; onLong?.(e); }, ms);
    },
    onPointerMove: (e) => {
      if (timer && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) cancel();
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    // قائمة النظام (نسخ/حفظ الصورة) لا تظهر عند الضغط المطوّل
    onContextMenu: (e) => e.preventDefault?.(),
    onClick: (e) => {
      if (fired) { fired = false; return; }
      onClick?.(e);
    },
  };
}
