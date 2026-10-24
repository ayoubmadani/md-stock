// بطاقة منتج في المخزون (اتجاه «ج»): الكمية بأزرار − و ＋ مباشرة.
// الضغطات المتتالية تُجمع وتُحفظ مرة واحدة كحركة واحدة؛ الضغط على الرقم يفتح التوريد/الجرد.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown, Minus, Package, Plus } from 'lucide-react';
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

const VISIBLE = 3; // نسخ كثيرة: أول 3 ثم «عرض الكل»

export default function ProductRow({ p, storeId, onAdjust, onChanged }) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const lines = stockLines(p);
  const shown = all ? lines : lines.slice(0, VISIBLE);

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-3">
      {/* الرأس: نفسه لكل المنتجات */}
      <div className="flex items-center gap-3">
        <Link to={`/products/${p.id}`} className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
          {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/products/${p.id}`} className="block font-semibold text-sm truncate text-start"><bdi>{p.name}</bdi></Link>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusBadge status={p.status} />
            {p.variants.length > 0 && <span className="text-[11px] text-gray-400">{t('inventory.variants', { count: p.variants.length })}</span>}
          </div>
        </div>
        <div className="text-end shrink-0">
          <p className="text-[11px] text-gray-400">{t('inventory.total')}</p>
          <p className="font-bold" dir="ltr">{fmt(p.stock)}</p>
        </div>
      </div>

      {/* الأسطر: سطر واحد للمنتج البسيط، سطر لكل نسخة */}
      <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-zinc-800 pt-3">
        {shown.map((l) => (
          <div key={l.key} className="flex items-center gap-3">
            <div className="w-24 shrink-0 min-w-0 space-y-1">
              {l.parts ? <VariantParts parts={l.parts} className="text-sm" /> : <span className="text-sm text-gray-500">{t('inventory.quantity')}</span>}
              {l.parts && <div><StatusBadge status={l.status} /></div>}
            </div>
            <div className="flex-1 min-w-0">
              <Stepper size="sm" storeId={storeId} productId={p.id} variantId={l.variantId} value={l.stock}
                name={l.parts ? `${p.name} — ${variantLabel(l.parts)}` : p.name} onOpen={onAdjust} onSaved={onChanged} />
            </div>
          </div>
        ))}
        {lines.length > VISIBLE && (
          <button type="button" onClick={() => setAll((a) => !a)} className="w-full flex items-center justify-center gap-1 pt-1 text-xs font-semibold text-indigo-500">
            {all ? t('inventory.show_less') : t('inventory.show_all', { count: lines.length })}
            <ChevronDown className={`w-4 h-4 transition-transform ${all ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}
