// كاميرا مسح الباركود (EAN/UPC/Code128/QR…) — الكاميرا الخلفية، مع إدخال يدوي احتياطي
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Check, Maximize2, Minimize2, Search, X } from 'lucide-react';

// compact: شريط رفيع (السلة ممتلئة) مع زر تكبير/تصغير onToggleSize · flash: { ok, text, price } وميض بعد المسح · extra: زر بجانب الخانة
export default function Scanner({ onDetected, paused = false, continuous = false, compact = false, onToggleSize, flash = null, extra = null }) {
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
      <div className={`relative w-full overflow-hidden bg-black transition-all duration-300 ${compact ? 'h-24 rounded-2xl' : 'aspect-[4/3] rounded-3xl'} ${
        flash ? (flash.ok ? 'ring-4 ring-emerald-500 shadow-[0_0_30px_rgba(16,185,129,.45)]' : 'ring-4 ring-rose-500') : ''}`}>
        {!paused && <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />}
        {/* إطار التوجيه */}
        <div className={`pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-2xl border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] ${compact ? 'inset-x-16 h-12' : 'inset-x-8 h-28'} ${
          flash ? (flash.ok ? 'border-emerald-400' : 'border-rose-400') : 'border-white/80'}`} />
        {onToggleSize && (
          <button type="button" onClick={onToggleSize} aria-label={t(compact ? 'scan.expand' : 'scan.shrink')}
            className="absolute top-2 end-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/55 text-white text-[11px] font-bold">
            {compact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}{t(compact ? 'scan.expand' : 'scan.shrink')}
          </button>
        )}
        {/* ما مُسح للتو: اسم وسعر (أخضر) أو «غير معروف» (أحمر) */}
        {flash && (
          <div className={`absolute bottom-2 inset-x-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white ${flash.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {flash.ok ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
            <span className="flex-1 min-w-0 truncate"><bdi>{flash.text}</bdi></span>
            {flash.price != null && <span className="shrink-0" dir="ltr">{Number(flash.price).toLocaleString('en-US')} DA</span>}
          </div>
        )}
        {error && <p className="absolute inset-x-4 bottom-4 text-center text-sm text-white bg-black/60 rounded-xl p-2">{error}</p>}
      </div>
      <div className="flex gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); const v = manual.trim(); if (!v) return; onDetected(v); if (continuous) setManual(''); }}
          className="relative flex-1"
        >
          <input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="numeric" dir="ltr" placeholder={t('scan.manual')}
            className="w-full pl-3 pr-11 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400" />
          <button aria-label={t('scan.go')} className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-lg text-gray-500 hover:text-indigo-600"><Search className="w-5 h-5" /></button>
        </form>
        {extra}
      </div>
    </div>
  );
}
