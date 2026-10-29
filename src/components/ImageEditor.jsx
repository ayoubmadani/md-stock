// تعديل صورة قبل الرفع (شعار، أيقونة، غلاف، منتج): قص يدوي بإطار زواياه تُسحب
// kind: logo | favicon | cover | cover_mobile | image — النسبة من EDIT_RATIO
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RotateCcw, X } from 'lucide-react';
import { EDIT_RATIO, dragRect, fitRect } from '../lib/logoEdit';

const MAX_SIDE = 1600; // نفس أقصى مقاس يحفظه الخادم
const KEEP_PNG = ['logo', 'favicon'];
const HANDLES = { nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize', ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize', sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize', se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' };
const CHECKER = { backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%)', backgroundSize: '16px 16px' };

/** الصورة مصغّرة إلى MAX_SIDE على canvas */
function loadSource(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_SIDE / img.naturalWidth, MAX_SIDE / img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}

/** onDone(file, changed): changed = false إذا لم يُقص ولم تُزل الخلفية */
export default function ImageEditor({ file, kind = 'image', onDone, onCancel }) {
  const ratio = EDIT_RATIO[kind];
  const { t } = useTranslation();
  const [src, setSrc] = useState(null);
  const [rect, setRect] = useState(null);
  const [saving, setSaving] = useState(false);
  const view = useRef(null);
  const box = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    loadSource(file).then((c) => { setSrc(c); setRect(fitRect(c.width, c.height, ratio)); }).catch(onCancel);
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  // المعاينة: الصورة كاملة مع إزالة الأبيض إن فُعّلت
  useEffect(() => {
    if (!src || !view.current) return;
    const v = view.current;
    v.width = src.width; v.height = src.height;
    const ctx = v.getContext('2d');
    ctx.clearRect(0, 0, v.width, v.height);
    ctx.drawImage(src, 0, 0);
  }, [src]);

  const down = (handle) => (e) => {
    e.preventDefault(); e.stopPropagation();
    box.current.setPointerCapture(e.pointerId);
    drag.current = { handle, x: e.clientX, y: e.clientY, start: rect, k: src.width / box.current.getBoundingClientRect().width };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    setRect(dragRect(d.start, d.handle, Math.round((e.clientX - d.x) * d.k), Math.round((e.clientY - d.y) * d.k), src.width, src.height, ratio));
  };
  const up = () => { drag.current = null; };

  const save = async () => {
    setSaving(true);
    // الغلاف والمنتج → JPEG حتى لا تتجاوز حد الرفع؛ الشعار والأيقونة → PNG (تبقى شفافيتهما)
    const jpeg = !KEEP_PNG.includes(kind);
    const out = document.createElement('canvas');
    out.width = rect.w; out.height = rect.h;
    const ctx = out.getContext('2d');
    if (jpeg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, rect.w, rect.h); }
    ctx.drawImage(view.current, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
    const type = jpeg ? 'image/jpeg' : 'image/png';
    const blob = await new Promise((res) => out.toBlob(res, type, 0.9));
    if (!blob) { setSaving(false); return; }
    const changed = rect.x !== 0 || rect.y !== 0 || rect.w !== src.width || rect.h !== src.height;
    onDone(new File([blob], `${file.name.replace(/\.\w+$/, '') || 'image'}.${jpeg ? 'jpg' : 'png'}`, { type }), changed);
  };

  const pct = (v, total) => `${(v / total) * 100}%`;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg p-4 space-y-3 max-h-[92dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{t(`image_editor.title_${kind}`)}</p>
          <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        {!src ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> : (
          <>
            <p className="text-[11px] text-gray-400">{t('image_editor.crop_hint')}</p>
            <div className="flex justify-center rounded-xl p-3" style={CHECKER}>
              <div ref={box} className="relative select-none touch-none" style={{ width: '100%', maxWidth: `min(100%, ${(src.width / src.height) * 300}px)` }}
                onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
                <canvas ref={view} className="block w-full h-auto" />
                {/* ما خارج الإطار معتّم */}
                <div className="absolute border-2 border-indigo-500 cursor-move" onPointerDown={down('move')}
                  style={{ left: pct(rect.x, src.width), top: pct(rect.y, src.height), width: pct(rect.w, src.width), height: pct(rect.h, src.height), boxShadow: '0 0 0 9999px rgba(0,0,0,.45)' }}>
                  {Object.entries(HANDLES).map(([h, cls]) => (
                    <span key={h} onPointerDown={down(h)} className={`absolute w-5 h-5 rounded-full bg-white border-2 border-indigo-500 ${cls}`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRect(fitRect(src.width, src.height, ratio))} className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-semibold">
                <RotateCcw className="w-4 h-4" />{t('image_editor.reset')}
              </button>
              <button type="button" onClick={save} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('image_editor.save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
