// بطاقة منتج في المخزون (اتجاه «ج»): الكمية بأزرار − و ＋ مباشرة.
// الضغطات المتتالية تُجمع وتُحفظ مرة واحدة كحركة واحدة؛ الضغط على الرقم يفتح التوريد/الجرد.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown, Minus, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
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

export default function ProductRow({ p, storeId, onAdjust, onChanged }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const hasVariants = p.variants.length > 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-3">
      <div className="flex items-center gap-3">
        <Link to={`/products/${p.id}`} className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
          {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/products/${p.id}`} className="block font-semibold text-sm truncate text-start"><bdi>{p.name}</bdi></Link>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusBadge status={p.status} />
            {hasVariants && <span className="text-[11px] text-gray-400">{t('inventory.variants', { count: p.variants.length })}</span>}
          </div>
        </div>
        {hasVariants && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 shrink-0">
            <span className="font-bold" dir="ltr">{fmt(p.stock)}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {!hasVariants && (
        <div className="mt-3">
          <Stepper storeId={storeId} productId={p.id} value={p.stock} name={p.name} onOpen={onAdjust} onSaved={onChanged} />
        </div>
      )}

      {hasVariants && open && (
        <div className="mt-3 space-y-2.5 border-t border-gray-100 dark:border-zinc-800 pt-3">
          {p.variants.map((v) => (
            <div key={v.id} className="flex items-center gap-3">
              <div className="w-24 shrink-0 space-y-1">
                <VariantParts parts={v.parts} className="text-sm" />
                <div><StatusBadge status={v.status} /></div>
              </div>
              <div className="flex-1">
                <Stepper size="sm" storeId={storeId} productId={p.id} variantId={v.id} value={v.stock} name={`${p.name} — ${variantLabel(v)}`} onOpen={onAdjust} onSaved={onChanged} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
