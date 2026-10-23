import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { VariantParts } from '../components/inventory';

export function MovementItem({ m }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3">
      <div className={`w-12 text-center font-bold text-lg ${m.delta > 0 ? 'text-emerald-500' : 'text-rose-500'}`} dir="ltr">{m.delta > 0 ? `+${m.delta}` : m.delta}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{m.productName || '—'}</p>
        {m.variantName && <VariantParts parts={m.variantName} className="text-xs text-gray-500 mt-0.5" />}
        <p className="text-xs text-gray-500">
          {t(`inventory.reason.${m.reason}`)}
          {m.orderId && <span className="text-indigo-500"> · {t('inventory.order', { id: String(m.orderId).slice(0, 8) })}</span>}
          {m.userName && <span> · {m.userName}</span>}
          {m.note && <span> · {m.note}</span>}
        </p>
      </div>
      <div className="text-end shrink-0">
        <p className="text-sm font-bold" dir="ltr">{m.stockAfter}</p>
        <p className="text-[11px] text-gray-400">{new Date(m.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-DZ' : i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!storeId) return;
    api.get(`/stores/${storeId}/inventory/movements`, { params: { page } })
      .then((r) => setData(r.data)).catch(() => setData({ items: [], total: 0, page: 1, limit: 30 }));
  }, [storeId, page]);

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  const pages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-gray-50 dark:divide-zinc-800/60">
        {data.items.length === 0 && <p className="text-center text-gray-400 py-16">{t('inventory.history_empty')}</p>}
        {data.items.map((m) => <MovementItem key={m.id} m={m} />)}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 disabled:opacity-40">{t('inventory.prev')}</button>
          <span className="text-gray-500" dir="ltr">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 disabled:opacity-40">{t('inventory.next')}</button>
        </div>
      )}
    </div>
  );
}
