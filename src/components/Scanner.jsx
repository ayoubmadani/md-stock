// كاميرا مسح الباركود (EAN/UPC/Code128/QR…) — الكاميرا الخلفية، مع إدخال يدوي احتياطي
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Keyboard } from 'lucide-react';

export default function Scanner({ onDetected, paused = false, continuous = false }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const doneRef = useRef(false);
  const [error, setError] = useState(null);
  const [manual, setManual] = useState('');

  // آخر دالة من الأب في ref: إعادة رسم الأب لا تعيد تشغيل الكاميرا
  const onDetectedRef = useRef(onDetected);
  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;
  useEffect(() => { onDetectedRef.current = onDetected; }, [onDetected]);

  useEffect(() => {
    if (paused) return undefined;
    doneRef.current = false;
    let controls;
    let cancelled = false;
    // تأخير صغير: React في التطوير يركّب المكوّن مرتين متتاليتين — بدون التأخير يُطلب الهاتف الكاميرا مرتين
    // وإيقاف الطلب الأول (يصل متأخراً على الهاتف) يقطع فيديو الثاني فتنغلق الكاميرا
    const timer = setTimeout(() => {
      const reader = new BrowserMultiFormatReader();
      reader
        .decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, videoRef.current, (result) => {
          if (!result || doneRef.current) return;
          // مرة واحدة لكل مسح — إلا في الوضع المستمر (بيع في المحل: يمنع التكرار بنفسه)
          if (!continuousRef.current) doneRef.current = true;
          navigator.vibrate?.(60);
          onDetectedRef.current(result.getText());
        })
        .then((c) => { if (cancelled) c.stop(); else controls = c; })
        .catch((e) => { if (!cancelled) setError(e?.name === 'NotAllowedError' ? t('scan.denied') : window.isSecureContext ? t('scan.no_camera') : t('scan.https')); });
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); controls?.stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
        {!paused && <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />}
        {/* إطار التوجيه */}
        <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-28 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        {error && <p className="absolute inset-x-4 bottom-4 text-center text-sm text-white bg-black/60 rounded-xl p-2">{error}</p>}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onDetected(manual.trim()); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Keyboard className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="numeric" dir="ltr" placeholder={t('scan.manual')}
            className="w-full ps-9 pe-3 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400" />
        </div>
        <button className="px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm">{t('scan.go')}</button>
      </form>
    </div>
  );
}
