// تثبيت التطبيق (PWA) من زر تحت نموذج الدخول:
// Chrome على Android: الحدث beforeinstallprompt يُلتقط عند التحميل (main.jsx) ويُستعمل عند الضغط (وإلا خطوات القائمة ⋮)
// Safari على iPhone: لا واجهة تثبيت — خطوات «مشاركة ← إضافة إلى الشاشة الرئيسية»
import { useEffect, useState } from 'react';
import { isStandalone } from './push';

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** يُستدعى مرة عند بدء التطبيق — قبل أن يطلق المتصفح الحدث */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify(); });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
}

// المتصفحات المدعومة للتثبيت: Chrome على Android و Safari على iPhone فقط — غيرها (Samsung، Firefox، Chrome iPhone،
// متصفح فيسبوك/إنستغرام داخل التطبيق…) ← رسالة «افتح في Chrome / Safari»؛ الحاسوب ← لا شيء
const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|; wv\)|TikTok|Snapchat/i;
const isAndroidChrome = (ua) => /Android/i.test(ua) && /Chrome\/\d+/.test(ua) && !/SamsungBrowser|EdgA|OPR|YaBrowser|UCBrowser|MiuiBrowser|HuaweiBrowser|Firefox/i.test(ua) && !IN_APP.test(ua);
const isIosSafari = (ua) => /iPhone|iPad|iPod/i.test(ua) && /Version\/[\d.]+.*Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua) && !IN_APP.test(ua);

export function installMode({ ua, standalone, canPrompt }) {
  if (standalone) return 'installed';
  if (/Android/i.test(ua)) return isAndroidChrome(ua) ? (canPrompt ? 'prompt' : 'android') : 'open-chrome';
  if (/iPhone|iPad|iPod/i.test(ua)) return isIosSafari(ua) ? 'ios' : 'open-safari';
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
  const read = () => installMode({ ua: navigator.userAgent, standalone: isStandalone(), canPrompt: !!deferred });
  const [mode, setMode] = useState(read);
  useEffect(() => {
    const fn = () => setMode(read());
    listeners.add(fn);
    fn();
    return () => listeners.delete(fn);
  }, []);
  return mode;
}
