// منتج سريع: صورة بالكاميرا، اسم، سعر، كمية، باركود (ممسوح/مكتوب/مولّد) — منتج عادي افتراضياً،
// ويصبح بنسخ عند إضافة خيار (مقاس، لون، أو أي خيار)، وكل تركيبة بكميتها وباركودها
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ImagePlus, Loader2, Minus, Plus, ScanLine, Trash2, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { uploadImage, ACCEPT } from '../lib/upload';
import { combos, quickErrors, quickProductBody, variantUpdates } from '../lib/quick-product';
import { fillMissingBarcodes, randomStoreEan13 } from '../lib/barcode';
import CameraCapture from './CameraCapture';
import Scanner from './Scanner';
import { input, label } from './product';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const smallInput = 'px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-sm';

// خيار واحد: اسمه + قيمه (المقاس بأزرار جاهزة)
function OptionCard({ opt, onChange, onRemove }) {
  const { t } = useTranslation();
  const [val, setVal] = useState('');
  const add = () => { const v = val.trim(); if (v && !opt.values.includes(v)) onChange({ ...opt, values: [...opt.values, v] }); setVal(''); };
  const toggle = (v) => onChange({ ...opt, values: opt.values.includes(v) ? opt.values.filter((x) => x !== v) : SIZES.filter((x) => [...opt.values, v].includes(x)).concat(opt.values.filter((x) => !SIZES.includes(x))) });
  const extra = opt.values.filter((v) => opt.kind !== 'size' || !SIZES.includes(v));
  return (
    <div className="rounded-xl border border-gray-100 dark:border-zinc-800 p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <input value={opt.name} onChange={(e) => onChange({ ...opt, name: e.target.value })} placeholder={t('quick.option_name')} className={`${smallInput} flex-1 min-w-0 font-bold`} />
        <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
      </div>
      {opt.kind === 'size' && (
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => <button key={s} type="button" onClick={() => toggle(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${opt.values.includes(s) ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-zinc-700'}`}>{s}</button>)}
        </div>
      )}
      <div className="flex gap-1.5">
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={opt.kind === 'color' ? t('quick.color_ph') : t('quick.value_ph')} className={`${smallInput} flex-1 min-w-0`} />
        <button type="button" onClick={add} className="px-2.5 rounded-lg bg-gray-100 dark:bg-zinc-800"><Plus className="w-4 h-4" /></button>
      </div>
      {extra.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {extra.map((v) => (
            <button key={v} type="button" onClick={() => onChange({ ...opt, values: opt.values.filter((x) => x !== v) })} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 text-xs font-bold">{v}<X className="w-3 h-3" /></button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuickProductSheet({ storeId, barcode = '', onClose, onCreated }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ name: '', price: '', stock: '1', costPrice: '', barcode, image: null, attrs: [] });
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [camera, setCamera] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [rows, setRows] = useState({}); // { 'M|أحمر': { qty, barcode } }
  const [scanFor, setScanFor] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v?.target ? v.target.value : v }));

  const list = combos(f.attrs.map((a) => a.values));
  const hasVariants = list.length > 0;
  const first = list[0]?.key;
  const row = (k) => rows[k] || { qty: '', barcode: k === first ? f.barcode : '' }; // الباركود الممسوح لأول تركيبة
  const setRow = (k, patch) => setRows((x) => ({ ...x, [k]: { ...row(k), ...patch } }));
  const totalQty = list.reduce((s, c) => s + (Number(row(c.key).qty) || 0), 0);
  const addOption = (kind) => setF((x) => ({ ...x, attrs: [...x.attrs, { id: `${Date.now()}`, kind, name: kind === 'size' ? t('quick.size') : kind === 'color' ? t('quick.color') : '', values: [] }] }));
  const has = (kind) => f.attrs.some((a) => a.kind === kind);

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
      const { data } = await api.post(`/stores/${storeId}/products`, quickProductBody(f));
      const product = data?.data || data;
      if (product?.id && f.costPrice !== '') await api.patch(`/stores/${storeId}/inventory/products/${product.id}`, { costPrice: Number(f.costPrice) }).catch(() => {});
      let scanned = f.barcode.trim();
      if (hasVariants && product?.id) {
        // كمية وباركود كل تركيبة (النسخ يولّدها الخادم)
        const effective = Object.fromEntries(list.map((c) => [c.key, row(c.key)]));
        const full = await api.get(`/stores/${storeId}/products/${product.id}`).then((x) => x.data?.data || x.data);
        for (const u of variantUpdates(full?.variantDetails || [], effective)) {
          await api.patch(`/stores/${storeId}/products/${product.id}/variants/${u.variantId}`, { stock: u.stock, barcode: u.barcode })
            .catch((err) => toast.error(errorMessage(err, t('inventory.error'))));
        }
        scanned = String(effective[first]?.barcode || '').trim();
      }
      toast.success(t('quick.created'));
      onCreated?.({ id: product?.id, name: f.name.trim(), price: Number(f.price), image: f.image, barcode: scanned, hasVariants });
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
              <input type="number" inputMode="numeric" dir="ltr" min="0" value={hasVariants ? totalQty : f.stock} onChange={set('stock')} disabled={hasVariants} placeholder={t('quick.qty')} className={`${input} disabled:opacity-50`} />
            </div>
          </div>
        </div>

        {/* باركود المنتج — للمنتج العادي فقط (بالخيارات: لكل تركيبة باركودها) */}
        {!hasVariants && (
          <div className="space-y-1.5">
            <label className={label}>{t('quick.barcode')}</label>
            <div className="flex gap-2">
              <input dir="ltr" value={f.barcode} onChange={set('barcode')} placeholder="—" className={`${input} font-mono`} />
              <button type="button" onClick={() => setScanning((v) => !v)} className={`px-3 rounded-xl ${scanning ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300'}`}><ScanLine className="w-5 h-5" /></button>
              <button type="button" onClick={() => set('barcode')(randomStoreEan13())} title={t('quick.generate')} className="px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300"><Wand2 className="w-5 h-5" /></button>
            </div>
            {scanning && <Scanner onDetected={(c) => { set('barcode')(String(c).trim()); setScanning(false); navigator.vibrate?.(40); }} />}
          </div>
        )}

        <input type="number" inputMode="numeric" dir="ltr" min="0" value={f.costPrice} onChange={set('costPrice')} placeholder={t('quick.cost')} className={input} />

        {/* الخيارات (اختياري): مقاس، لون، أو أي خيار */}
        <div className="space-y-2">
          <p className={label}>{t('quick.options')}</p>
          {f.attrs.map((a) => (
            <OptionCard key={a.id} opt={a} onChange={(next) => setF((x) => ({ ...x, attrs: x.attrs.map((y) => (y.id === a.id ? next : y)) }))} onRemove={() => setF((x) => ({ ...x, attrs: x.attrs.filter((y) => y.id !== a.id) }))} />
          ))}
          <div className="flex flex-wrap gap-1.5">
            {!has('size') && <button type="button" onClick={() => addOption('size')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-zinc-700 text-xs font-bold text-indigo-600"><Plus className="w-3.5 h-3.5" />{t('quick.size')}</button>}
            {!has('color') && <button type="button" onClick={() => addOption('color')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-zinc-700 text-xs font-bold text-indigo-600"><Plus className="w-3.5 h-3.5" />{t('quick.color')}</button>}
            <button type="button" onClick={() => addOption('custom')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-zinc-700 text-xs font-bold text-indigo-600"><Plus className="w-3.5 h-3.5" />{t('quick.other_option')}</button>
          </div>
        </div>

        {/* كل تركيبة بكميتها وباركودها */}
        {hasVariants && list.some((c) => !String(row(c.key).barcode ?? '').trim()) && (
          <button type="button" onClick={async () => {
            const codes = await fillMissingBarcodes(list.map((c) => c.key), Object.fromEntries(list.map((c) => [c.key, row(c.key).barcode])));
            setRows((x) => ({ ...x, ...Object.fromEntries(Object.entries(codes).map(([k, b]) => [k, { ...row(k), barcode: b }])) }));
          }} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/40 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <Wand2 className="w-4 h-4" />{t('product.barcodes_all', { count: list.filter((c) => !String(row(c.key).barcode ?? '').trim()).length })}
          </button>
        )}
        {hasVariants && (
          <div className="rounded-xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
            {list.map((c) => {
              const rw = row(c.key);
              return (
                <div key={c.key} className="p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 text-sm font-bold truncate">{c.values.map((v, i) => <span key={i}>{i > 0 && ' · '}<bdi>{v}</bdi></span>)}</span>
                    <button type="button" onClick={() => setRow(c.key, { qty: Math.max(0, (Number(rw.qty) || 0) - 1) })} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                    <input type="number" inputMode="numeric" dir="ltr" min="0" value={rw.qty} onChange={(e) => setRow(c.key, { qty: e.target.value })} placeholder="0" className="w-14 px-1 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-center font-bold" />
                    <button type="button" onClick={() => setRow(c.key, { qty: (Number(rw.qty) || 0) + 1 })} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input dir="ltr" value={rw.barcode} onChange={(e) => setRow(c.key, { barcode: e.target.value })} placeholder={t('quick.barcode')} className={`${smallInput} flex-1 min-w-0 text-xs font-mono`} />
                    <button type="button" onClick={() => setScanFor(scanFor === c.key ? null : c.key)} className={`p-1.5 rounded-lg ${scanFor === c.key ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}><ScanLine className="w-4 h-4" /></button>
                    <button type="button" onClick={() => setRow(c.key, { barcode: randomStoreEan13() })} className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500"><Wand2 className="w-4 h-4" /></button>
                  </div>
                  {scanFor === c.key && <Scanner onDetected={(code) => { setRow(c.key, { barcode: String(code).trim() }); setScanFor(null); navigator.vibrate?.(40); }} />}
                </div>
              );
            })}
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
