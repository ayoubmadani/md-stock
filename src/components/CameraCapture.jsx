// تصوير منتج بإطار مربع 1:1 داخل التطبيق: ما يظهر في المربع هو الصورة نفسها.
// إن لم تعمل الكاميرا هنا (رفض الإذن…) تُفتح كاميرا الهاتف العادية وتُقصّ الصورة مربعاً من الوسط.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { squareFile, squareFromFile } from '../lib/square';

export default function CameraCapture({ onCapture, onClose }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const nativeRef = useRef(null);
  const [facing, setFacing] = useState('environment');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stream;
    let cancelled = false;
    setReady(false);
    // تأخير صغير: React في التطوير يركّب مرتين — طلب واحد فقط للكاميرا
    const timer = setTimeout(async () => {
      try {
        // exact أولاً: بعض الهواتف تتجاهل ideal فلا تنقلب الكاميرا
        const size = { width: { ideal: 1920 }, height: { ideal: 1920 } };
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: facing }, ...size }, audio: false })
          .catch(() => navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, ...size }, audio: false }));
        if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); stream?.getTracks().forEach((tr) => tr.stop()); };
  }, [facing]);

  // بديل: كاميرا الهاتف العادية
  useEffect(() => { if (failed) nativeRef.current?.click(); }, [failed]);

  const shoot = async () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    setBusy(true);
    try {
      navigator.vibrate?.(30);
      onCapture(await squareFile(v, v.videoWidth, v.videoHeight, { name: `photo-${Date.now()}.jpg` }));
    } finally {
      setBusy(false);
    }
  };

  const fromNative = async (file) => {
    if (!file) return onClose();
    setBusy(true);
    try { onCapture(await squareFromFile(file)); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <button type="button" onClick={onClose} className="p-2 rounded-full bg-white/10"><X className="w-5 h-5" /></button>
        <span className="text-sm font-bold">1:1</span>
        <button type="button" onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} disabled={failed} className="p-2 rounded-full bg-white/10 disabled:opacity-30"><RefreshCw className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        {/* المربع: object-cover يقص من الوسط — نفس قص الصورة الملتقطة */}
        <div className="relative w-full max-w-md aspect-square rounded-2xl overflow-hidden bg-zinc-900">
          <video ref={videoRef} muted playsInline className={`w-full h-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`} />
          {!ready && !failed && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-white/70" /></div>}
          {failed && <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-sm text-white/80">{t('camera.fallback')}</p>}
          {/* شبكة الأثلاث للتوسيط */}
          <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }, (_, i) => <span key={i} className="border border-white/15" />)}
          </div>
        </div>
      </div>

      <div className="flex justify-center p-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={shoot} disabled={!ready || busy} aria-label={t('camera.shoot')}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40">
          {busy ? <Loader2 className="w-7 h-7 animate-spin text-white" /> : <span className="w-16 h-16 rounded-full bg-white" />}
        </button>
      </div>

      <input ref={nativeRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => fromNative(e.target.files?.[0])} />
    </div>
  );
}
