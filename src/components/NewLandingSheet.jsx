// صفحة هبوط جديدة: صفحة صور بالذكاء الاصطناعي (الافتراضي) / صفحة نصوص بالذكاء الاصطناعي / فارغة
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Camera, ChevronLeft, ChevronRight, ImagePlus, Images, LayoutTemplate, Loader2, RotateCcw, Sparkles, Type, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { captureAndUpload, fetchProductPhoto, generateImagePage } from '../lib/imagePage/generator';
import { progressFor } from '../lib/imagePage/progress';
import { movePhoto } from '../lib/imagePage/photos';
import { input, label } from './product';

const MODES = [
  { id: 'image', icon: Images },
  { id: 'blocks', icon: Type },
  { id: 'empty', icon: LayoutTemplate },
];

export default function NewLandingSheet({ storeId, products, onClose, onDone }) {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState('image');
  const [productId, setProductId] = useState('');
  const [name, setName] = useState('');
  const [lang, setLang] = useState(['ar', 'fr', 'en'].includes(i18n.language) ? i18n.language : 'ar');
  const [color, setColor] = useState(null);
  // الصور المختارة بالترتيب (الأولى رئيسية): { n, url } صورة منتج برقمها، أو { file, url } صورة من الهاتف
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [usage, setUsage] = useState(null);
  const [step, setStep] = useState(null);
  const [stepAt, setStepAt] = useState(0);
  const [, tick] = useState(0);
  const [shots, setShots] = useState({ count: 0, urls: [] });
  const [retry, setRetry] = useState(null); // { pageId, design } بعد فشل التصوير/الرفع
  const fileRef = useRef(null);
  const busy = !!step;

  useEffect(() => { api.get('/builder-pages/image-pages/usage').then((r) => setUsage({ used: Number(r.data?.used) || 0, limit: Number(r.data?.limit) || 0 })).catch(() => {}); }, []);
  useEffect(() => { if (!step) return undefined; const id = setInterval(() => tick((n) => n + 1), 400); return () => clearInterval(id); }, [step]);
  // اختيار منتج ← صوره تظهر فوراً (من بيانات المنتج، بنفس ترتيبها)
  useEffect(() => {
    setPhotos((l) => l.filter((x) => x.file));
    if (!productId) return;
    setLoadingPhotos(true);
    api.get(`/stores/${storeId}/products/${productId}`)
      .then(({ data }) => {
        const p = data?.data ?? data;
        const urls = [...(p?.imagesProduct ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((i) => i.imageUrl).filter(Boolean);
        setPhotos((l) => [...urls.slice(0, 3).map((url, n) => ({ n, url })), ...l.filter((x) => x.file)].slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoadingPhotos(false));
  }, [productId, storeId]);

  const go = (s) => { setStep(s); setStepAt(Date.now()); };
  const onPreview = ({ count, index, blob }) => setShots((p) => {
    const urls = index < 0 ? Array(count).fill(null) : p.urls.map((u, i) => (i === index ? URL.createObjectURL(blob) : u));
    return { count, urls };
  });
  const limitReached = mode === 'image' && usage && usage.limit > 0 && usage.used >= usage.limit;
  const noQuota = mode === 'image' && usage && usage.limit === 0;
  const productName = products.find((p) => p.id === productId)?.name;

  const finish = async (pageId, tree) => {
    go('save');
    await api.put(`/builder-pages/${pageId}/tree`, { tree });
    go('publish');
    await api.post(`/builder-pages/${pageId}/publish`);
    toast.success(t('lp.ready'));
    onDone();
  };

  const create = async () => {
    let pageId;
    try {
      go('create');
      const { data: page } = await api.post('/builder-pages', { name: name.trim() || productName || t('lp.untitled'), storeId, productId: productId || undefined });
      pageId = page.id;
      if (mode === 'empty' || !productId) { toast.success(t('lp.created')); return onDone(); }
      if (mode === 'blocks') {
        go('ai');
        const { data: gen } = await api.post(`/builder-pages/${pageId}/generate`, { productId, language: lang }, { timeout: 180000 });
        if (gen?.imageFailed) toast.message(t('lp.image_failed'));
        go('publish');
        await api.post(`/builder-pages/${pageId}/publish`);
        toast.success(t('lp.ready'));
        return onDone();
      }
      // صفحة صور
      go('photos');
      const files = (await Promise.all(photos.map((x) => (x.file ? x.file : fetchProductPhoto(pageId, productId, x.n).catch(() => null))))).filter(Boolean);
      if (!files.length) throw new Error(t('lp.no_photos'));
      const tree = await generateImagePage({ pageId, files, productId, language: lang, primaryColor: color || undefined, onStep: go, onPreview });
      await finish(pageId, tree);
    } catch (e) {
      if (e?.design && pageId) setRetry({ pageId, design: e.design });
      toast.error(e?.message === 'unsupported_image' ? t('lp.unsupported') : errorMessage(e, e?.message || t('inventory.error')), { duration: 10000 });
      setStep(null);
    }
  };

  // إعادة التصوير والرفع بنفس التصميم — بلا احتساب جديد
  const recapture = async () => {
    try {
      const tree = await captureAndUpload(retry.pageId, retry.design, { onStep: go, onPreview });
      setRetry(null);
      await finish(retry.pageId, tree);
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
      setStep(null);
    }
  };

  const captured = shots.urls.filter(Boolean).length;
  const pct = step === 'save' || step === 'publish' ? 100 : progressFor({ step, elapsedMs: Date.now() - stepAt, captured, count: shots.count });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 max-h-[92dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between"><p className="font-bold">{t('lp.new')}</p>{!busy && <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>}</div>

        {busy ? (
          <div className="space-y-3 py-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><Loader2 className="w-4 h-4 animate-spin text-violet-500" />{t(`lp.step_${step}`)}</p>
            {mode === 'image' && (
              <>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                {shots.count > 0 && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {shots.urls.map((u, i) => <div key={i} className="aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800">{u ? <img src={u} alt="" className="w-full h-full object-cover object-top" /> : <div className="w-full h-full animate-pulse" />}</div>)}
                  </div>
                )}
                <p className="text-[11px] text-gray-400">{t('lp.keep_open')}</p>
              </>
            )}
          </div>
        ) : retry ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-zinc-300">{t('lp.retry_hint')}</p>
            <button type="button" onClick={recapture} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold"><RotateCcw className="w-4 h-4" />{t('lp.retry')}</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              {MODES.map((m) => (
                <button key={m.id} type="button" onClick={() => setMode(m.id)} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-[11px] font-bold ${mode === m.id ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-gray-100 dark:border-zinc-800 text-gray-500'}`}>
                  <m.icon className="w-5 h-5" />{t(`lp.mode_${m.id}`)}
                </button>
              ))}
            </div>
            {mode === 'image' && usage && <p className={`text-[11px] font-semibold ${limitReached || noQuota ? 'text-rose-600' : 'text-gray-500'}`}>{noQuota ? t('lp.no_quota') : t('lp.usage', { used: usage.used, limit: usage.limit })}</p>}

            <div className="space-y-1.5"><label className={label}>{t('lp.product')}</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className={input}>
                <option value="">{t('lp.no_product')}</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {mode === 'image' && (
              <div className="space-y-1.5">
                <label className={label}>{t('lp.photos')}</label>
                <div className="flex gap-2">
                  {loadingPhotos && <span className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></span>}
                  {photos.map((o, i) => (
                    <div key={o.url} className="flex flex-col items-center gap-1">
                      {/* الضغط على الصورة يجعلها الرئيسية */}
                      <button type="button" onClick={() => setPhotos((l) => movePhoto(l, i, 0))} className={`relative w-[4.5rem] h-[4.5rem] rounded-xl overflow-hidden bg-gray-100 ${i === 0 ? 'ring-2 ring-violet-500' : ''}`}>
                        <img src={o.url} alt="" className="w-full h-full object-cover" />
                        {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-violet-600 text-white text-[9px] font-bold py-0.5">{t('lp.main_photo')}</span>}
                      </button>
                      <div className="flex items-center gap-0.5">
                        <button type="button" disabled={i === 0} onClick={() => setPhotos((l) => movePhoto(l, i, i - 1))} className="p-1 rounded-md text-gray-400 disabled:opacity-20"><ChevronRight className="w-3.5 h-3.5 ltr:rotate-180" /></button>
                        <button type="button" onClick={() => setPhotos((l) => l.filter((_, j) => j !== i))} className="p-1 rounded-md text-rose-500"><X className="w-3.5 h-3.5" /></button>
                        <button type="button" disabled={i === photos.length - 1} onClick={() => setPhotos((l) => movePhoto(l, i, i + 1))} className="p-1 rounded-md text-gray-400 disabled:opacity-20"><ChevronLeft className="w-3.5 h-3.5 ltr:rotate-180" /></button>
                      </div>
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <button type="button" onClick={() => fileRef.current?.click()} className="w-[4.5rem] h-[4.5rem] rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-0.5 text-gray-400">
                      <ImagePlus className="w-5 h-5" /><Camera className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const add = [...(e.target.files || [])].slice(0, 3 - photos.length).map((file) => ({ file, url: URL.createObjectURL(file) })); setPhotos((l) => [...l, ...add]); e.target.value = ''; }} />
                <p className="text-[11px] text-gray-400">{t('lp.photos_hint')}</p>
                <p className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed"><AlertTriangle className="w-4 h-4 shrink-0" />{t('lp.photos_warning')}</p>
              </div>
            )}

            {mode !== 'empty' && (
              <div className="space-y-1.5">
                <label className={label}>{t('lp.language')}</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['ar', 'fr', 'en'].map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={`py-2 rounded-lg text-xs font-bold ${lang === l ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}>{t(`stores.lang_${l}`)}</button>)}
                </div>
              </div>
            )}

            {mode === 'image' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 flex-1">{t('lp.main_color')}</span>
                <button type="button" onClick={() => setColor(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!color ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}>{t('lp.auto')}</button>
                <label className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${color ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}>
                  <input type="color" value={color || '#f59e0b'} onChange={(e) => setColor(e.target.value)} className="w-5 h-5 rounded border-0 p-0 bg-transparent" />{color || t('lp.pick')}
                </label>
              </div>
            )}

            <div className="space-y-1.5"><label className={label}>{t('lp.name')}</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('lp.name_ph')} className={input} /></div>

            {mode !== 'empty' && !productId && <p className="text-[11px] text-amber-600">{t('lp.ai_need_product')}</p>}
            <button type="button" disabled={(mode !== 'empty' && !productId) || (mode === 'empty' && !name.trim() && !productId) || (mode === 'image' && (!photos.length || loadingPhotos)) || limitReached || noQuota} onClick={create}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold disabled:opacity-50">
              {mode !== 'empty' && <Sparkles className="w-4 h-4" />}{t(`lp.create_${mode}`)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
