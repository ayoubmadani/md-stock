// Service Worker لتطبيق MdStore: يستقبل إشعارات الطلبات ويفتح الطلب عند الضغط
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() }; }
  event.waitUntil((async () => {
    // التطبيق ظاهر على الشاشة: هو يشغّل صوت العملة، والإشعار يصل بلا صوت (لا صوتان معاً)
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visible = wins.some((w) => w.visibilityState === 'visible');
    wins.forEach((w) => w.postMessage({ type: 'push', data }));
    await self.registration.showNotification(data.title || 'MdStore', {
    silent: visible,
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/favicon-32.png',
    tag: data.tag,
    renotify: !!data.tag,
    dir: 'auto',
    lang: 'ar',
    data: { url: data.url || '/' },
    });
  })());
});

// الضغط: نافذة التطبيق المفتوحة تنتقل للطلب، وإلا نفتح نافذة جديدة
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find((w) => w.url.startsWith(self.location.origin));
    if (win) { await win.focus(); return win.navigate(url); }
    return self.clients.openWindow(url);
  })());
});
