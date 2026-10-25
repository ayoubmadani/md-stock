// إشعارات تطبيق الهاتف (Web Push): تفعيل/إيقاف على هذا الجهاز
import { api } from './api';

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// iPhone: الإشعارات تعمل فقط من تطبيق مُضاف للشاشة الرئيسية
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

const b64ToBytes = (b64) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export const registerSw = () => (pushSupported() ? navigator.serviceWorker.register('/sw.js').catch(() => null) : Promise.resolve(null));

/** هل هذا الجهاز مسجّل؟ */
export async function pushState() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

export async function enablePush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = (await navigator.serviceWorker.getRegistration('/')) || (await navigator.serviceWorker.register('/sw.js'));
  await navigator.serviceWorker.ready;
  const { data } = await api.get('/push/vapid');
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(data.publicKey) }));
  await api.post('/push/subscribe', sub.toJSON());
  return 'on';
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }
  return 'off';
}

const currentSub = async () => {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return null;
    const reg = await navigator.serviceWorker.getRegistration('/');
    return (await reg?.pushManager.getSubscription()) || null;
  } catch {
    return null;
  }
};

/** بعد الدخول/تبديل الحساب: هاتف مفعّل الإشعارات يُسجَّل للحساب الحالي (الخادم ينقله إليه) */
export async function syncPush() {
  const sub = await currentSub();
  if (sub) await api.post('/push/subscribe', sub.toJSON()).catch(() => {});
}

/** قبل الخروج: الحساب الذي نخرج منه لا يرسل إشعارات لهذا الهاتف بعد الآن */
export async function releasePush() {
  const sub = await currentSub();
  if (sub) await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
}
