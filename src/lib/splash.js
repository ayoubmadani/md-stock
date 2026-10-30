// شاشة البداية مكتوبة في index.html فتظهر قبل تحميل الكود؛ تُخفى بتلاشٍ عندما يجهز التطبيق

export const splashVisible = (doc = document) => !!doc.getElementById('splash');

export function hideSplash(doc = document) {
  const el = doc.getElementById('splash');
  if (!el || el.classList.contains('splash-out')) return;
  el.classList.add('splash-out');
  setTimeout(() => el.remove(), 300);
}
