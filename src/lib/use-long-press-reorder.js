import { useEffect, useRef, useState } from 'react';

const HOLD_MS = 350; // مدة الضغط قبل أن يبدأ السحب
const SLOP = 8; // حركة أكبر قبل انتهاء المدة = تمرير الصفحة، لا سحب

/**
 * ترتيب بالضغط المطوّل: اضغط على عنصر ~⅓ ثانية (يهتز الهاتف)، اسحبه فوق عنصر آخر، اترك.
 * onDrop(from, to) يُستدعى عند الترك. العناصر تحمل data-reorder-index (من bind).
 * أثناء السحب تُمنع حركة الصفحة، وتُلغى «النقرة» التي تلي الترك (حتى لا يُضغط زر الحذف تحت الإصبع).
 */
export function useLongPressReorder(onDrop) {
  const [drag, setDrag] = useState(null); // { from, over }
  const st = useRef(null); // { timer, x, y, from, over, active }
  const dropRef = useRef(onDrop);
  useEffect(() => { dropRef.current = onDrop; }, [onDrop]);

  useEffect(() => {
    const indexAt = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest?.('[data-reorder-index]');
      return el ? Number(el.dataset.reorderIndex) : null;
    };
    const point = (e) => (e.touches?.[0] || e.changedTouches?.[0] || e);
    const reset = () => { clearTimeout(st.current?.timer); st.current = null; setDrag(null); };

    const onMove = (e) => {
      const s = st.current;
      if (!s) return;
      const { clientX: x, clientY: y } = point(e);
      if (!s.active) {
        if (Math.hypot(x - s.x, y - s.y) > SLOP) reset();
        return;
      }
      if (e.cancelable) e.preventDefault(); // لا تمرير أثناء السحب
      const over = indexAt(x, y);
      if (over !== null && over !== s.over) { s.over = over; setDrag({ from: s.from, over }); }
    };
    const onEnd = () => {
      const s = st.current;
      if (s?.active) {
        if (s.over !== s.from) dropRef.current(s.from, s.over);
        // النقرة التي تلي الترك لا تصل لأي زر
        const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        window.addEventListener('click', stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 400);
      }
      reset();
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    window.addEventListener('mouseup', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('mouseup', onEnd);
      clearTimeout(st.current?.timer);
    };
  }, []);

  const start = (i, x, y) => {
    clearTimeout(st.current?.timer);
    const s = { x, y, from: i, over: i, active: false };
    s.timer = setTimeout(() => {
      if (st.current !== s) return;
      s.active = true;
      try { navigator.vibrate?.(30); } catch { /* غير مدعوم */ }
      setDrag({ from: i, over: i });
    }, HOLD_MS);
    st.current = s;
  };

  const bind = (i) => ({
    'data-reorder-index': i,
    onTouchStart: (e) => { const p = e.touches[0]; start(i, p.clientX, p.clientY); },
    onMouseDown: (e) => { if (e.button === 0) start(i, e.clientX, e.clientY); },
    onContextMenu: (e) => e.preventDefault(), // لا قائمة «حفظ الصورة» عند الضغط المطوّل
    style: { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' },
  });

  return { drag, bind };
}
