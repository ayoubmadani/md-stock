// زر «تثبيت التطبيق» (تحت نموذج الدخول): تثبيت بضغطة على Android/Chrome، وخطوات مصوّرة على iPhone
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, PlusSquare, Share, X } from 'lucide-react';
import { promptInstall, useInstallMode } from '../lib/install';

export default function InstallButton() {
  const { t } = useTranslation();
  const mode = useInstallMode();
  const [steps, setSteps] = useState(false);
  if (mode === 'installed' || mode === 'none') return null;

  const press = () => (mode === 'prompt' ? promptInstall() : setSteps(true));
  return (
    <>
      <button type="button" onClick={press}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 font-semibold">
        <Download className="w-5 h-5" />{t('install.button')}
      </button>
      {steps && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setSteps(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <p className="font-bold">{t('install.ios_title')}</p>
              <button type="button" onClick={() => setSteps(false)} aria-label={t('rates.close')} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 grid place-items-center shrink-0"><Share className="w-5 h-5" /></span>{t('install.ios_step1')}</li>
              <li className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 grid place-items-center shrink-0"><PlusSquare className="w-5 h-5" /></span>{t('install.ios_step2')}</li>
              <li className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 grid place-items-center shrink-0 font-bold">✓</span>{t('install.ios_step3')}</li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
