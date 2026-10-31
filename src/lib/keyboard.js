// لوحة المفاتيح على الهاتف: المودل المفتوح يتقلّص إلى الجزء الظاهر فوقها.
// أندرويد: interactive-widget=resizes-content في index.html يكفي (dvh يتقلّص وحده).
// آيفون: الشاشة لا تتقلّص، فنقيس visualViewport ونضع html.kb و --vvh / --vvt (القواعد في index.css).

const MIN_KEYBOARD = 120; // أقل من هذا = شريط العنوان أو التكبير، لا لوحة مفاتيح

export function keyboardState(innerHeight, vv) {
  if (!vv) return { open: false, height: innerHeight, top: 0 };
  const open = innerHeight - vv.height > MIN_KEYBOARD;
  return open
    ? { open, height: Math.round(vv.height), top: Math.round(vv.offsetTop) }
    : { open, height: innerHeight, top: 0 };
}

export function watchKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  const update = () => {
    const s = keyboardState(window.innerHeight, vv);
    root.classList.toggle('kb', s.open);
    root.style.setProperty('--vvh', `${s.height}px`);
    root.style.setProperty('--vvt', `${s.top}px`);
    // الخانة المكتوب فيها تبقى ظاهرة داخل المودل بعد تقلّصه
    const el = document.activeElement;
    if (s.open && el?.matches?.('input, textarea, select, [contenteditable]')) {
      requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }));
    }
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
}
