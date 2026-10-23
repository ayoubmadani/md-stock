// إضافة/تعديل منتج من تطبيق المخزون: الأساسيات + الباركود (مسح بالكاميرا) + باركود كل نسخة.
// بناء المقاسات والألوان نفسها يبقى في لوحة التاجر.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, ScanLine, Trash2, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import Scanner from '../components/Scanner';
import { VariantParts } from '../components/inventory';

const input = 'w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400';
const label = 'text-xs font-semibold text-gray-500 dark:text-zinc-400';

// نافذة المسح لملء خانة باركود
function ScanModal({ onClose, onCode }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{t('scan.title')}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <Scanner onDetected={(c) => { onCode(c); onClose(); }} />
      </div>
    </div>
  );
}

function BarcodeInput({ value, onChange }) {
  const { t } = useTranslation();
  const [scan, setScan] = useState(false);
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" inputMode="numeric" placeholder={t('product.barcode_ph')} className={input} />
      <button type="button" onClick={() => setScan(true)} className="shrink-0 px-4 rounded-xl bg-indigo-600 text-white" title={t('scan.title')}><ScanLine className="w-5 h-5" /></button>
      {scan && <ScanModal onClose={() => setScan(false)} onCode={onChange} />}
    </div>
  );
}

export default function ProductForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]); // روابط موجودة
  const [uploading, setUploading] = useState(false);
  const [variants, setVariants] = useState([]); // [{ id, parts, barcode, original }]
  const [form, setForm] = useState({
    name: '', price: '', priceOriginal: '', costPrice: '', stock: '', lowStockThreshold: '5', categoryId: '',
    barcode: new URLSearchParams(window.location.search).get('barcode') || '',
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === 'string' ? v : v.target.value }));

  useEffect(() => {
    // شجرة التصنيفات ← قائمة مسطّحة (الفرعي بمسافة قبله)
    const flatten = (list, depth = 0) => (list || []).flatMap((c) => [{ id: c.id, name: `${'— '.repeat(depth)}${c.name}` }, ...flatten(c.children, depth + 1)]);
    api.get(`/stores/${storeId}/categories`).then((r) => setCategories(flatten(r.data?.data || r.data || []))).catch(() => setCategories([]));
    if (isNew) return;
    api.get(`/stores/${storeId}/products/${id}`)
      .then(({ data }) => {
        const p = data?.data || data;
        setForm({
          name: p.name || '', price: String(p.price ?? ''), priceOriginal: p.priceOriginal ? String(p.priceOriginal) : '',
          costPrice: p.costPrice != null ? String(p.costPrice) : '', stock: String(p.stock ?? 0),
          lowStockThreshold: String(p.lowStockThreshold ?? 5), categoryId: p.categoryId || p.category?.id || '', barcode: p.barcode || '',
        });
        setImages((p.imagesProduct || []).map((i) => i.imageUrl).filter(Boolean));
        setVariants((p.variantDetails || []).map((v) => ({ id: v.id, parts: v.name, barcode: v.barcode || '', original: v.barcode || '' })));
      })
      .catch(() => { toast.error(t('inventory.error')); navigate('/stock'); })
      .finally(() => setLoading(false));
  }, [id, isNew, storeId, navigate, t]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post('/images/upload?folder=products', body);
      if (data?.url) setImages((list) => [data.url, ...list]);
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const num = (v) => (v === '' || v == null ? undefined : Number(v));
    const base = {
      name: form.name.trim(),
      price: Number(form.price),
      priceOriginal: num(form.priceOriginal),
      categoryId: form.categoryId || undefined,
      barcode: form.barcode.trim() || null,
      images,
    };
    try {
      let productId = id;
      if (isNew) {
        const { data } = await api.post(`/stores/${storeId}/products`, { ...base, stock: num(form.stock) ?? 0, attributes: [], variantDetails: [] });
        productId = (data?.data || data)?.id;
      } else {
        await api.patch(`/stores/${storeId}/products/${id}`, variants.length ? base : { ...base, stock: num(form.stock) ?? 0 });
        // باركود النسخ المعدّلة فقط
        for (const v of variants.filter((x) => x.barcode.trim() !== x.original)) {
          await api.patch(`/stores/${storeId}/products/${id}/variants/${v.id}`, { barcode: v.barcode.trim() || null });
        }
      }
      // سعر الشراء وحد التنبيه (إعدادات المخزون)
      if (productId) {
        await api.patch(`/stores/${storeId}/inventory/products/${productId}`, {
          lowStockThreshold: Number(form.lowStockThreshold) || 0,
          costPrice: form.costPrice === '' ? null : Number(form.costPrice),
        });
      }
      toast.success(t('inventory.saved'));
      navigate('/stock');
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('product.confirm_delete'))) return;
    try {
      await api.delete(`/stores/${storeId}/products/${id}`);
      toast.success(t('product.deleted'));
      navigate('/stock');
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <form onSubmit={save} className="max-w-xl mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500"><ArrowRight className="w-4 h-4 ltr:rotate-180" />{t('product.back')}</button>
        <h1 className="font-bold">{isNew ? t('product.new') : t('product.edit')}</h1>
        {!isNew ? <button type="button" onClick={remove} className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button> : <span className="w-8" />}
      </div>

      {/* الصور */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <label className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center text-gray-400 cursor-pointer">
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
          <input type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {images.map((src) => (
          <div key={src} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800">
            <img src={src} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => setImages((l) => l.filter((x) => x !== src))} className="absolute top-1 end-1 p-0.5 rounded-md bg-black/60 text-white"><X className="w-3 h-3" /></button>
          </div>
        ))}
      </div>

      <div className="space-y-1.5"><label className={label}>{t('product.name')}</label><input required value={form.name} onChange={set('name')} className={input} /></div>

      <div className="space-y-1.5"><label className={label}>{t('product.barcode')}</label><BarcodeInput value={form.barcode} onChange={set('barcode')} /></div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><label className={label}>{t('product.price')}</label><input required type="number" inputMode="decimal" min={0} dir="ltr" value={form.price} onChange={set('price')} className={input} /></div>
        <div className="space-y-1.5"><label className={label}>{t('product.old_price')}</label><input type="number" inputMode="decimal" min={0} dir="ltr" value={form.priceOriginal} onChange={set('priceOriginal')} className={input} /></div>
        <div className="space-y-1.5"><label className={label}>{t('inventory.col.cost')}</label><input type="number" inputMode="decimal" min={0} dir="ltr" value={form.costPrice} onChange={set('costPrice')} placeholder="—" className={input} /></div>
        <div className="space-y-1.5"><label className={label}>{t('inventory.col.threshold')}</label><input type="number" inputMode="numeric" min={0} dir="ltr" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} className={input} /></div>
        {!variants.length && (
          <div className="space-y-1.5 col-span-2"><label className={label}>{t('inventory.col.stock')}</label><input type="number" inputMode="numeric" min={0} dir="ltr" value={form.stock} onChange={set('stock')} className={input} /></div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="space-y-1.5">
          <label className={label}>{t('product.category')}</label>
          <select value={form.categoryId} onChange={set('categoryId')} className={input}>
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {/* باركود كل نسخة — بناء المقاسات/الألوان من لوحة التاجر */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <p className={label}>{t('product.variants_barcodes')}</p>
          {variants.map((v, i) => (
            <div key={v.id} className="rounded-xl border border-gray-100 dark:border-zinc-800 p-3 space-y-2">
              <VariantParts parts={v.parts} className="text-sm" />
              <BarcodeInput value={v.barcode} onChange={(val) => setVariants((l) => l.map((x, j) => (j === i ? { ...x, barcode: val } : x)))} />
            </div>
          ))}
          <p className="text-[11px] text-gray-400">{t('product.variants_note')}</p>
        </div>
      )}

      <div className="fixed md:static bottom-16 inset-x-0 p-4 md:p-0 bg-gray-50/95 dark:bg-zinc-950/95 md:bg-transparent">
        <button disabled={saving} className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-60">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('inventory.save')}
        </button>
      </div>
    </form>
  );
}
