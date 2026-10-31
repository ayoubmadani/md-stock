// البيع في المحل: زر «معلومات» في سطر السلة ← المخزون والحالة والسعر والباركود، والخيارات الأخرى.
// صاحب صلاحية المنتجات: توريد / جرد / تعديل المنتج من هنا.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ClipboardCheck, Loader2, Package, Pencil, Plus, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { lineInfo } from '../lib/pos';
import { AdjustModal, StatusBadge, VariantParts, fmt } from './inventory';

export default function ProductInfoSheet({ storeId, line, onClose }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const nav = useNavigate();
  const [info, setInfo] = useState(undefined); // undefined = تحميل، null = غير موجود
  const [adjust, setAdjust] = useState(null);

  const load = useCallback(() => api.get(`/stores/${storeId}/inventory`)
    .then(({ data }) => setInfo(lineInfo(data?.products || [], line)))
    .catch((e) => { setInfo(null); toast.error(errorMessage(e, t('inventory.error'))); }), [storeId, line, t]);
  useEffect(() => { load(); }, [load]);

  const p = info?.product;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92dvh] overflow-y-auto p-5 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <span className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 grid place-items-center">
            {(p?.image || line.image) ? <img src={p?.image || line.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-400" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate"><bdi>{p?.name || line.name}</bdi></p>
            {line.parts?.length > 0 && <VariantParts parts={line.parts} className="text-sm text-gray-500 mt-0.5" />}
          </div>
          <button type="button" onClick={onClose} aria-label={t('rates.close')} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>

        {info === undefined && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}
        {info === null && <p className="text-center text-sm text-gray-500 py-6">{t('pos.info_missing')}</p>}
        {info && (
          <>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-zinc-950 p-3">
              <span className="text-sm text-gray-500">{t('inventory.col.stock')}</span>
              <span className="flex items-center gap-2"><StatusBadge status={info.status} /><b className="text-2xl" dir="ltr">{fmt(info.stock)}</b></span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-gray-50 dark:bg-zinc-950 p-3"><p className="text-xs text-gray-500">{t('pos.info_price')}</p><b dir="ltr">{fmt(info.price)} DA</b></div>
              <div className="rounded-xl bg-gray-50 dark:bg-zinc-950 p-3 min-w-0"><p className="text-xs text-gray-500">{t('pos.info_barcode')}</p><b className="block truncate" dir="ltr">{info.barcode || '—'}</b></div>
            </div>
            {/* بقية الخيارات: هل يوجد مقاس آخر؟ */}
            {p.variants?.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-gray-400">{t('pos.info_options')}</p>
                <div className="rounded-xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
                  {p.variants.map((v) => (
                    <div key={v.id} className={`flex items-center justify-between gap-2 px-3 py-2 text-sm ${String(v.id) === String(line.variantId) ? 'bg-indigo-50/60 dark:bg-indigo-500/10' : ''}`}>
                      <span className="min-w-0 truncate"><bdi>{v.label}</bdi></span>
                      <span className="flex items-center gap-2 shrink-0"><StatusBadge status={v.status} /><b dir="ltr">{fmt(v.stock)}</b></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {can('product.crud') && (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setAdjust('add')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"><Plus className="w-4 h-4" />{t('inventory.restock')}</button>
                <button type="button" onClick={() => setAdjust('set')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold"><ClipboardCheck className="w-4 h-4" />{t('inventory.count')}</button>
                <button type="button" onClick={() => nav(`/products/${p.id}`)} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold"><Pencil className="w-4 h-4" />{t('product.edit')}</button>
              </div>
            )}
          </>
        )}
      </div>
      {adjust && info && (
        <AdjustModal storeId={storeId}
          target={{ productId: p.id, variantId: info.variant?.id, name: p.name, stock: info.stock, mode: adjust }}
          onClose={() => setAdjust(null)}
          onSaved={() => { setAdjust(null); toast.success(t('inventory.saved')); load(); }} />
      )}
    </div>
  );
}
