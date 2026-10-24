// المنتج كاملاً من الهاتف (نفس نموذج لوحة التاجر): الصور، الأساسيات، الخصائص والنسخ، العروض، المخزون
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { productPayload, validateProduct } from '../lib/product-form';
import { AttributesEditor, BarcodeField, DescEditor, ImagesEditor, OffersEditor, Section, Toggle, VariantsEditor, input, label } from '../components/product';

const EMPTY = {
  name: '', desc: '', price: '', priceOriginal: '', costPrice: '', stock: '', lowStockThreshold: '5',
  categoryId: '', barcode: '', shippingFree: false, isDigital: false, isActive: true,
};

export default function ProductForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(() => ({ ...EMPTY, barcode: new URLSearchParams(window.location.search).get('barcode') || '' }));
  const [images, setImages] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [offers, setOffers] = useState([]);
  const [variants, setVariants] = useState([]);
  const [savedAttrs, setSavedAttrs] = useState('[]'); // لمعرفة هل تغيّرت الخصائص منذ آخر حفظ
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  const load = () => api.get(`/stores/${storeId}/products/${id}`).then(({ data }) => {
    const p = data?.data || data;
    setForm({
      name: p.name || '', desc: p.desc || '', price: String(p.price ?? ''), priceOriginal: p.priceOriginal ? String(p.priceOriginal) : '',
      costPrice: p.costPrice != null ? String(p.costPrice) : '', stock: String(p.stock ?? 0), lowStockThreshold: String(p.lowStockThreshold ?? 5),
      categoryId: p.categoryId || p.category?.id || '', barcode: p.barcode || '',
      shippingFree: !!p.shippingFree, isDigital: !!p.isDigital, isActive: p.isActive !== false,
    });
    setImages((p.imagesProduct || []).map((i) => i.imageUrl).filter(Boolean));
    const attrs = (p.attributes || []).map((a) => ({ ...a, variants: a.variants || [], displayMode: a.displayMode || (a.type === 'color' ? 'color' : undefined) }));
    setAttributes(attrs);
    setSavedAttrs(JSON.stringify(attrs));
    setOffers((p.offers || []).map((o) => ({ ...o, quantity: String(o.quantity ?? ''), price: String(o.price ?? '') })));
    setVariants(p.variantDetails || []);
  });

  useEffect(() => {
    // شجرة التصنيفات ← قائمة مسطّحة
    const flatten = (list, depth = 0) => (list || []).flatMap((c) => [{ id: c.id, name: `${'— '.repeat(depth)}${c.name}` }, ...flatten(c.children, depth + 1)]);
    api.get(`/stores/${storeId}/categories`).then((r) => setCategories(flatten(r.data?.data || r.data || []))).catch(() => setCategories([]));
    if (isNew) return;
    load().catch(() => { toast.error(t('inventory.error')); navigate('/stock'); }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, storeId]);

  const save = async (e) => {
    e.preventDefault();
    const errs = validateProduct(form, { attributes, offers });
    if (errs.length) return toast.error(errs.map((k) => t(`product.err.${k}`)).join(' — '));
    setSaving(true);
    try {
      const body = productPayload(form, { attributes, offers, images });
      let productId = id;
      if (isNew) {
        const { data } = await api.post(`/stores/${storeId}/products`, body);
        productId = (data?.data || data)?.id;
      } else {
        await api.patch(`/stores/${storeId}/products/${id}`, body);
      }
      if (productId) {
        await api.patch(`/stores/${storeId}/inventory/products/${productId}`, {
          lowStockThreshold: Number(form.lowStockThreshold) || 0,
          costPrice: form.costPrice === '' ? null : Number(form.costPrice),
        });
      }
      toast.success(t('inventory.saved'));
      // بعد الإنشاء/تغيير الخصائص: نبقى في الصفحة لتعديل سعر وكمية كل نسخة
      if (isNew) navigate(productId ? `/products/${productId}` : '/stock', { replace: true });
      else await load();
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
  const attrsDirty = JSON.stringify(attributes) !== savedAttrs;

  return (
    <form onSubmit={save} className="max-w-xl mx-auto space-y-3 pb-28 md:pb-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500"><ArrowRight className="w-4 h-4 ltr:rotate-180" />{t('product.back')}</button>
        <h1 className="font-bold">{isNew ? t('product.new') : t('product.edit')}</h1>
        {!isNew ? <button type="button" onClick={remove} className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button> : <span className="w-8" />}
      </div>

      <Section title={t('product.images')}>
        <ImagesEditor images={images} onChange={setImages} />
      </Section>

      <Section title={t('product.basics')}>
        <div className="space-y-1.5"><label className={label}>{t('product.name')}</label><input value={form.name} onChange={set('name')} className={input} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={label}>{t('product.price')}</label><input type="number" inputMode="decimal" min={0} dir="ltr" value={form.price} onChange={set('price')} className={input} /></div>
          <div className="space-y-1.5"><label className={label}>{t('product.old_price')}</label><input type="number" inputMode="decimal" min={0} dir="ltr" value={form.priceOriginal} onChange={set('priceOriginal')} className={input} /></div>
        </div>
        <div className="space-y-1.5"><label className={label}>{t('product.description')}</label><DescEditor value={form.desc} onChange={set('desc')} /></div>
        {categories.length > 0 && (
          <div className="space-y-1.5">
            <label className={label}>{t('product.category')}</label>
            <select value={form.categoryId} onChange={set('categoryId')} className={input}>
              <option value="">—</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          <Toggle checked={form.isActive} onChange={set('isActive')}>{t('product.visible')}</Toggle>
          <Toggle checked={form.shippingFree} onChange={set('shippingFree')}>{t('product.free_shipping')}</Toggle>
          <Toggle checked={form.isDigital} onChange={set('isDigital')}>{t('product.digital')}</Toggle>
        </div>
      </Section>

      <Section title={t('product.attr.title')}>
        <AttributesEditor attributes={attributes} onChange={setAttributes} />
      </Section>

      {!isNew && variants.length > 0 && (
        <Section title={t('product.variants_title', { count: variants.length })}>
          <VariantsEditor variants={variants} storeId={storeId} productId={id} dirty={attrsDirty} />
        </Section>
      )}
      {isNew && attributes.length > 0 && <p className="text-xs text-gray-400 px-1">{t('product.variants_after_save')}</p>}

      <Section title={t('product.offer.title')}>
        <OffersEditor offers={offers} onChange={setOffers} />
      </Section>

      <Section title={t('product.stock_section')}>
        <div className="grid grid-cols-2 gap-3">
          {!attributes.length && (
            <div className="space-y-1.5 col-span-2"><label className={label}>{t('inventory.col.stock')}</label><input type="number" inputMode="numeric" min={0} dir="ltr" value={form.stock} onChange={set('stock')} className={input} /></div>
          )}
          <div className="space-y-1.5"><label className={label}>{t('inventory.col.cost')}</label><input type="number" inputMode="decimal" min={0} dir="ltr" value={form.costPrice} onChange={set('costPrice')} placeholder="—" className={input} /></div>
          <div className="space-y-1.5"><label className={label}>{t('inventory.col.threshold')}</label><input type="number" inputMode="numeric" min={0} dir="ltr" value={form.lowStockThreshold} onChange={set('lowStockThreshold')} className={input} /></div>
        </div>
        <div className="space-y-1.5"><label className={label}>{t('product.barcode')}</label><BarcodeField value={form.barcode} onChange={set('barcode')} /></div>
      </Section>

      <div className="fixed md:static bottom-16 inset-x-0 p-4 md:p-0 bg-gray-50/95 dark:bg-zinc-950/95 md:bg-transparent z-30">
        <button disabled={saving} className="w-full max-w-xl mx-auto flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-60">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('inventory.save')}
        </button>
      </div>
    </form>
  );
}
