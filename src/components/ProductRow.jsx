// منتج في قائمة المخزون: بطاقة على الهاتف وسطر على الحاسوب، والنسخ تُفتح تحته
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Package, Plus, ClipboardCheck } from 'lucide-react';
import { StatusBadge, InlineNumber, VariantParts, fmt } from './inventory';

function Actions({ onRestock, onCount }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1.5 shrink-0">
      <button type="button" onClick={onRestock} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
        <Plus className="w-3.5 h-3.5" />{t('inventory.restock')}
      </button>
      <button type="button" onClick={onCount} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
        <ClipboardCheck className="w-3.5 h-3.5" />{t('inventory.count')}
      </button>
    </div>
  );
}

export default function ProductRow({ p, onAdjust, onSettings }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const hasVariants = p.variants.length > 0;
  const adjust = (mode, v) => onAdjust({ productId: p.id, variantId: v?.id, name: v ? `${p.name} — ${v.label}` : p.name, stock: v ? v.stock : p.stock, mode });

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-3 p-3">
        <button type="button" disabled={!hasVariants} onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 flex-1 min-w-0 text-start">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
            {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{p.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={p.status} />
              {hasVariants && (
                <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                  {t('inventory.variants', { count: p.variants.length })}
                  <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                </span>
              )}
            </div>
          </div>
        </button>
        <div className="text-end shrink-0">
          <p className="text-xl font-bold" dir="ltr">{fmt(p.stock)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <label className="flex items-center gap-1.5">{t('inventory.col.threshold')}
            <InlineNumber key={`t-${p.id}-${p.lowStockThreshold}`} value={p.lowStockThreshold} onSave={(v) => onSettings(p.id, { lowStockThreshold: v ?? 0 })} className="w-14" />
          </label>
          <label className="flex items-center gap-1.5">{t('inventory.col.cost')}
            <InlineNumber key={`c-${p.id}-${p.costPrice}`} value={p.costPrice} placeholder="—" onSave={(v) => onSettings(p.id, { costPrice: v })} />
          </label>
        </div>
        {!hasVariants && <Actions onRestock={() => adjust('add')} onCount={() => adjust('set')} />}
      </div>

      {open && (
        <div className="border-t border-gray-100 dark:border-zinc-800 divide-y divide-gray-50 dark:divide-zinc-800/60">
          {p.variants.map((v) => (
            <div key={v.id} className="flex items-center gap-3 px-3 py-2.5 ps-6">
              <div className="flex-1 min-w-0">
                <VariantParts parts={v.parts} className="text-sm" />
                <StatusBadge status={v.status} />
              </div>
              <p className="font-bold w-12 text-end" dir="ltr">{fmt(v.stock)}</p>
              <Actions onRestock={() => adjust('add', v)} onCount={() => adjust('set', v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
