// منتج في المخزون: بطاقة مختصرة، والضغط يفتح نافذة الكميات بأزرار − و＋.
// الضغطات المتتالية تُجمع وتُحفظ مرة واحدة كحركة واحدة؛ الضغط على الرقم يفتح التوريد/الجرد.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronLeft, Minus, Package, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { stockLines } from '../lib/stock-lines';
import { StatusBadge, VariantParts, fmt, variantLabel } from './inventory';

const SAVE_AFTER_MS = 700;

function Stepper({ storeId, productId, variantId, value, name, onOpen, onSaved, size = 'md' }) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const saved = useRef(value); // آخر قيمة يعرفها الخادم
  const timer = useRef(null);

  // بعد إعادة التحميل: نأخذ القيمة الجديدة إن لم يكن هناك تغيير ينتظر الحفظ
  useEffect(() => {
    if (timer.current) return;
    saved.current = value;
    shownRef.current = value;
    setShown(value);
  }, [value]);

  const commit = async () => {
    timer.current = null;
    const delta = shownRef.current - saved.current;
    if (!delta) return;
    saved.current += delta;
    try {
      await api.post(`/stores/${storeId}/inventory/adjust`, { productId, variantDetailId: variantId || null, mode: 'add', quantity: delta });
      onSaved?.();
    } catch {
      saved.current -= delta;
      shownRef.current = saved.current;
      setShown(saved.current); // رجوع للقيمة المحفوظة
      toast.error(t('inventory.error'));
    }
  };

  const bump = (delta) => {
    const next = Math.max(0, shownRef.current + delta);
    shownRef.current = next;
    setShown(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(commit, SAVE_AFTER_MS);
  };

  // حفظ ما بقي عند مغادرة الصفحة
  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); commit(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const h = size === 'sm' ? 'h-9' : 'h-11';
  const w = size === 'sm' ? 'w-9' : 'w-11';
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => bump(-1)} disabled={shown <= 0} aria-label="−"
        className={`${w} ${h} shrink-0 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-white flex items-center justify-center active:scale-95 disabled:opacity-40`}>
        <Minus className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => onOpen({ productId, variantId, name, stock: shown, mode: 'add' })}
        className={`flex-1 min-w-0 ${h} rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 font-bold ${size === 'sm' ? 'text-base' : 'text-lg'}`} dir="ltr">
        {fmt(shown)}
      </button>
      <button type="button" onClick={() => bump(1)} aria-label="+"
        className={`${w} ${h} shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center active:scale-95`}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

// نافذة المنتج: كل أسطر المخزون (المنتج نفسه أو نسخه) بأزرار − و＋
function StockSheet({ p, storeId, onAdjust, onChanged, onClose }) {
  const { t } = useTranslation();
  const lines = stockLines(p);

  // بلا تمرير للصفحة خلف النافذة
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[88dvh] flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-zinc-800">
          <span className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
            {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate"><bdi>{p.name}</bdi></p>
            <p className="text-xs text-gray-400 mt-0.5">{t('inventory.total')}: <b className="text-gray-900 dark:text-white" dir="ltr">{fmt(p.stock)}</b></p>
          </div>
          <Link to={`/products/${p.id}`} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800" title={t('product.edit')}><Pencil className="w-4 h-4" /></Link>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-3">
              <div className="w-24 shrink-0 min-w-0 space-y-1">
                {l.parts ? <VariantParts parts={l.parts} className="text-sm font-semibold" /> : <span className="text-sm text-gray-500">{t('inventory.quantity')}</span>}
                <div><StatusBadge status={l.status} /></div>
              </div>
              <div className="flex-1 min-w-0">
                <Stepper storeId={storeId} productId={p.id} variantId={l.variantId} value={l.stock}
                  name={l.parts ? `${p.name} — ${variantLabel(l.parts)}` : p.name} onOpen={onAdjust} onSaved={onChanged} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// بطاقة مختصرة بنفس الشكل لكل المنتجات؛ الضغط يفتح النافذة
export default function ProductRow({ p, storeId, onAdjust, onChanged }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const problems = p.variants.filter((v) => v.status !== 'ok').length;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-3 text-start active:scale-[0.99] transition-transform">
        <span className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
          {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-sm truncate"><bdi>{p.name}</bdi></span>
          <span className="flex items-center gap-1.5 mt-1">
            <StatusBadge status={p.status} />
            {p.variants.length > 0 && (
              <span className="text-[11px] text-gray-400 truncate">
                {t('inventory.variants', { count: p.variants.length })}{problems > 0 && ` · ${t('inventory.need_attention', { count: problems })}`}
              </span>
            )}
          </span>
        </span>
        <span className="text-end shrink-0">
          <span className="block text-[11px] text-gray-400">{t('inventory.total')}</span>
          <span className="block font-bold text-lg leading-tight" dir="ltr">{fmt(p.stock)}</span>
        </span>
        <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0 ltr:rotate-180" />
      </button>
      {open && <StockSheet p={p} storeId={storeId} onAdjust={onAdjust} onChanged={onChanged} onClose={() => setOpen(false)} />}
    </>
  );
}
