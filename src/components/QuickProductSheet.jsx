// منتج سريع: صورة بالكاميرا، اسم، سعر، كمية، باركود (ممسوح/مكتوب/مولّد)، ومقاسات/ألوان فقط إن وُجدت
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ChevronDown, ImagePlus, Loader2, Plus, ScanLine, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { uploadImage, ACCEPT } from '../lib/upload';
import { quickErrors, quickProductBody } from '../lib/quick-product';
import { randomStoreEan13 } from '../lib/barcode';
import CameraCapture from './CameraCapture';
import Scanner from './Scanner';
import { input, label } from './product';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

export default function QuickProductSheet({ storeId, barcode = '', onClose, onCreated }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ name: '', price: '', stock: '1', costPrice: '', barcode, image: null, sizes: [], colors: [] });
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [camera, setCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [opts, setOpts] = useState(false);
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v?.target ? v.target.value : v }));
  const toggleSize = (s) => setF((x) => ({ ...x, sizes: x.sizes.includes(s) ? x.sizes.filter((y) => y !== s) : SIZES.filter((y) => [...x.sizes, s].includes(y)) }));
  const addColor = () => { const c = color.trim(); if (c && !f.colors.includes(c)) setF((x) => ({ ...x, colors: [...x.colors, c] })); setColor(''); };

  // الصورة تُرفع فور التقاطها (في الخلفية) — الحفظ ينتظرها
  const takeImage = async (file) => {
    setCamera(false);
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try { const { url } = await uploadImage(file, 'products'); setF((x) => ({ ...x, image: url })); } catch (e) { toast.error(errorMessage(e, t('library.upload_failed'))); setPreview(null); } finally { setUploading(false); }
  };

  const save = async (e) => {
    e.preventDefault();
    const errs = quickErrors(f);
    if (errs.length) return toast.error(errs.map((k) => t(`product.err.${k}`)).join(' — '));
    setSaving(true);
    try {
      const { data } = await api.post(`/stores/${storeId}/products`, quickProductBody(f, { size: t('quick.size'), color: t('quick.color') }));
      const product = data?.data || data;
      if (product?.id && f.costPrice !== '') await api.patch(`/stores/${storeId}/inventory/products/${product.id}`, { costPrice: Number(f.costPrice) }).catch(() => {});
      toast.success(t('quick.created'));
      onCreated?.({ id: product?.id, name: f.name.trim(), price: Number(f.price), image: f.image, barcode: f.barcode.trim(), hasVariants: !!(f.sizes.length || f.colors.length) });
    } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form onSubmit={save} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 max-h-[94dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between"><p className="font-bold">{t('quick.title')}</p><button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>

        <div className="flex gap-3">
          <div className="shrink-0 space-y-1">
            <button type="button" onClick={() => setCamera(true)} className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-1 text-gray-400">
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : <><Camera className="w-7 h-7" /><span className="text-[11px] font-bold">{t('quick.photo')}</span></>}
              {uploading && <span className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></span>}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-1 text-[11px] font-bold text-indigo-600"><ImagePlus className="w-3.5 h-3.5" />{t('quick.gallery')}</button>
            <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => { takeImage(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <input value={f.name} onChange={set('name')} placeholder={t('quick.name')} className={input} />
            <div className="grid grid-cols-2 gap-2">
              <div className="relative"><input type="number" inputMode="numeric" dir="ltr" min="0" value={f.price} onChange={set('price')} placeholder={t('quick.price')} className={`${input} pr-10`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400">DA</span></div>
              <div className="relative"><input type="number" inputMode="numeric" dir="ltr" min="0" value={f.stock} onChange={set('stock')} disabled={!!(f.sizes.length || f.colors.length)} placeholder={t('quick.qty')} className={`${input} disabled:opacity-40`} /></div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={label}>{t('quick.barcode')}</label>
          <div className="flex gap-2">
            <input dir="ltr" value={f.barcode} onChange={set('barcode')} placeholder="—" className={`${input} font-mono`} />
            <button type="button" onClick={() => setScanning((v) => !v)} className={`px-3 rounded-xl ${scanning ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300'}`}><ScanLine className="w-5 h-5" /></button>
            <button type="button" onClick={() => set('barcode')(randomStoreEan13())} title={t('quick.generate')} className="px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300"><Wand2 className="w-5 h-5" /></button>
          </div>
          {scanning && <Scanner onDetected={(c) => { set('barcode')(String(c).trim()); setScanning(false); navigator.vibrate?.(40); }} />}
        </div>

        <input type="number" inputMode="numeric" dir="ltr" min="0" value={f.costPrice} onChange={set('costPrice')} placeholder={t('quick.cost')} className={input} />

        {/* المقاسات/الألوان — فقط إن وُجدت */}
        <button type="button" onClick={() => setOpts((v) => !v)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 text-sm font-semibold">
          <span>{t('quick.options')}{(f.sizes.length || f.colors.length) ? ` (${[...f.sizes, ...f.colors].length})` : ''}</span><ChevronDown className={`w-4 h-4 transition-transform ${opts ? 'rotate-180' : ''}`} />
        </button>
        {opts && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => <button key={s} type="button" onClick={() => toggleSize(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${f.sizes.includes(s) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-zinc-700'}`}>{s}</button>)}
            </div>
            <div className="flex gap-2">
              <input value={color} onChange={(e) => setColor(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addColor(); } }} placeholder={t('quick.color_ph')} className={input} />
              <button type="button" onClick={addColor} className="px-3 rounded-xl bg-gray-100 dark:bg-zinc-800"><Plus className="w-5 h-5" /></button>
            </div>
            {f.colors.length > 0 && <div className="flex flex-wrap gap-1.5">{f.colors.map((c) => <button key={c} type="button" onClick={() => setF((x) => ({ ...x, colors: x.colors.filter((y) => y !== c) }))} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 text-xs font-bold">{c}<X className="w-3 h-3" /></button>)}</div>}
            <p className="text-[11px] text-gray-400">{t('quick.options_hint')}</p>
          </div>
        )}

        <button disabled={saving || uploading} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60">
          {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}{t('quick.save')}
        </button>
      </form>
      {camera && <CameraCapture onClose={() => setCamera(false)} onCapture={takeImage} />}
    </div>
  );
}
