// زر الرجوع في الهاتف: إن كانت نافذة مفتوحة يغلقها ولا يرجع للصفحة السابقة.
// يعمل مع كل نوافذ التطبيق دون تعديلها: كل نافذة طبقة "fixed inset-0" — عند ظهورها تُضاف خطوة في السجل،
// والرجوع يغلق العليا (نقرة على خلفيتها، وإلا زر X فيها)

/** النوافذ المفتوحة بترتيب الصفحة (العليا آخراً) */
export const openOverlays = (doc = document) => [...doc.querySelectorAll('div.fixed.inset-0')];

/** زر الإغلاق (أيقونة X) داخل النافذة */
export function clickCloseButton(el) {
  const btn = el.querySelector('svg.lucide-x')?.closest('button');
  if (!btn) return false;
  btn.click();
  return true;
}

/**
 * يغلق النافذة العليا بنقرة على خلفيتها. stillOpen (للتجربة/الاستدعاء المتزامن): إن بقيت مفتوحة يُضغط زر X.
 * يرجع true إن وُجدت نافذة.
 */
export function closeTopOverlay(doc = document, { stillOpen } = {}) {
  const list = openOverlays(doc);
  const top = list[list.length - 1];
  if (!top) return false;
  top.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  if (stillOpen?.(top)) clickCloseButton(top);
  return true;
}

/** يُستدعى مرة واحدة عند تشغيل التطبيق */
export function installBackClose(win = window) {
  const doc = win.document;
  let depth = 0; // خطوات أضفناها في السجل (واحدة لكل نافذة مفتوحة)
  let ignore = 0; // رجوع قمنا به نحن (نافذة أُغلقت بزرها) — لا يُغلق شيئاً آخر

  const sync = () => {
    const n = openOverlays(doc).length;
    while (depth < n) { win.history.pushState({ ...(win.history.state || {}), mdsModal: true }, ''); depth++; }
    // أُغلقت بزرها/خلفيتها: نزيل خطوتها — فقط إن بقينا في نفس الصفحة (لا نلغي انتقالاً لصفحة أخرى)
    while (depth > n) {
      depth--;
      if (win.history.state?.mdsModal) { ignore++; win.history.back(); }
    }
  };

  new MutationObserver(sync).observe(doc.body, { childList: true, subtree: true });

  win.addEventListener('popstate', () => {
    if (ignore > 0) { ignore--; return; }
    if (depth === 0) return;
    depth--;
    const list = openOverlays(doc);
    const top = list[list.length - 1];
    if (!top) return;
    closeTopOverlay(doc);
    // نافذة لا تُغلق بالخلفية ← زر X بعد أن يرسم React
    setTimeout(() => { if (top.isConnected) clickCloseButton(top); }, 60);
  });
}
