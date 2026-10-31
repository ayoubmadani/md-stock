// تثبيت التطبيق (PWA) من زر تحت نموذج الدخول:
// Android/Chrome/Edge: الحدث beforeinstallprompt يُلتقط عند التحميل (main.jsx) ويُستعمل عند الضغط
// iPhone/iPad: لا واجهة تثبيت — نعرض خطوات «مشاركة ← إضافة إلى الشاشة الرئيسية»
import { useEffect, useState } from 'react';
import { isIos, isStandalone } from './push';

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** يُستدعى مرة عند بدء التطبيق — قبل أن يطلق المتصفح الحدث */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
}

export function installMode({ standalone, ios, canPrompt }) {
  if (standalone) return 'installed';
  if (canPrompt) return 'prompt';
  if (ios) return 'ios';
  return 'none';
}

/** يفتح نافذة التثبيت؛ true إن قبل المستخدم */
export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null; // الحدث يُستعمل مرة واحدة
  notify();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === 'accepted';
}

export function useInstallMode() {
  const read = () => installMode({ standalone: isStandalone(), ios: isIos(), canPrompt: !!deferred });
  const [mode, setMode] = useState(read);
  useEffect(() => {
    const fn = () => setMode(read());
    listeners.add(fn);
    fn();
    return () => listeners.delete(fn);
  }, []);
  return mode;
}
