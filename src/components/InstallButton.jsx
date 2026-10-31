// «تثبيت التطبيق» تحت نموذج الدخول — Chrome على Android و Safari على iPhone فقط؛
// متصفح آخر على الهاتف ← رسالة «افتح في Chrome / Safari»؛ الحاسوب أو تطبيق مثبت ← لا شيء
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Download, EllipsisVertical, ExternalLink, PlusSquare, Share, X } from 'lucide-react';
import { promptInstall, useInstallMode } from '../lib/install';

const STEPS = {
  ios: [[Share, 'install.ios_step1'], [PlusSquare, 'install.ios_step2'], [Check, 'install.ios_step3']],
  android: [[EllipsisVertical, 'install.android_step1'], [Download, 'install.android_step2'], [Check, 'install.android_step3']],
};

function Steps({ mode, onClose }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{t(mode === 'ios' ? 'install.ios_title' : 'install.android_title')}</p>
          <button type="button" onClick={onClose} aria-label={t('rates.close')} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <ol className="space-y-3 text-sm">
          {STEPS[mode].map(([Icon, key]) => (
            <li key={key} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 grid place-items-center shrink-0"><Icon className="w-5 h-5" /></span>{t(key)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// متصفح غير مدعوم: Android ← فتح الصفحة في Chrome مباشرة (intent)، iPhone ← نسخ الرابط للصقه في Safari
function OpenElsewhere({ mode }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const url = window.location.href;
  const chromeIntent = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* المتصفح يمنع النسخ */ }
  };
  return (
    <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3 space-y-2 text-center">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{t(mode === 'open-chrome' ? 'install.open_chrome' : 'install.open_safari')}</p>
      <div className="flex justify-center gap-2">
        {mode === 'open-chrome' && (
          <a href={chromeIntent} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 text-xs font-bold text-gray-700 dark:text-zinc-200">
            <ExternalLink className="w-4 h-4" />{t('install.open_in_chrome')}
          </a>
        )}
        <button type="button" onClick={copy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 text-xs font-bold text-gray-700 dark:text-zinc-200">
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}{copied ? t('install.copied') : t('install.copy_link')}
        </button>
      </div>
    </div>
  );
}

export default function InstallButton() {
  const { t } = useTranslation();
  const mode = useInstallMode();
  const [steps, setSteps] = useState(false);
  if (mode === 'installed' || mode === 'none') return null;
  if (mode === 'open-chrome' || mode === 'open-safari') return <OpenElsewhere mode={mode} />;

  // Chrome عرض التثبيت ← نافذته الرسمية، وإلا (أو على iPhone) الخطوات
  const press = () => (mode === 'prompt' ? promptInstall() : setSteps(true));
  return (
    <>
      <button type="button" onClick={press}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 font-semibold">
        <Download className="w-5 h-5" />{t('install.button')}
      </button>
      {steps && <Steps mode={mode === 'ios' ? 'ios' : 'android'} onClose={() => setSteps(false)} />}
    </>
  );
}
