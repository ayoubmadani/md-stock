import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { useInventory } from '../lib/useInventory';
import ProductRow from '../components/ProductRow';
import { AdjustModal } from '../components/inventory';

export default function StockPage({ only }) {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const { data, reload } = useInventory(storeId);
  const [filter, setFilter] = useState(only || 'all');
  const [q, setQ] = useState('');
  const [adjust, setAdjust] = useState(null);

  const counts = useMemo(() => {
    const list = data?.products || [];
    return { all: list.length, low: list.filter((p) => p.status === 'low').length, out: list.filter((p) => p.status === 'out').length };
  }, [data]);

  const rows = useMemo(() => (data?.products || []).filter((p) =>
    (filter === 'all' ? true : filter === 'attention' ? p.status !== 'ok' : p.status === filter)
    && (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))), [data, filter, q]);

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('inventory.search')}
            className="w-full ps-9 pe-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-indigo-400" />
        </div>
        {!only && (
          <Link to="/products/new" className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
            <Plus className="w-4 h-4" />{t('product.new')}
          </Link>
        )}
        {!only && (
          <div className="flex gap-1.5">
            {['all', 'low', 'out'].map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-3 py-2 rounded-xl text-xs font-bold border ${filter === f ? 'bg-indigo-600 text-white border-transparent' : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300'}`}>
                {t(`inventory.filter.${f}`)} <span className="opacity-70" dir="ltr">{counts[f]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-center text-gray-400 py-16">{only ? t('alerts_empty') : t('inventory.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {rows.map((p) => <ProductRow key={p.id} p={p} storeId={storeId} onAdjust={setAdjust} onChanged={reload} />)}
        </div>
      )}

      {adjust && (
        <AdjustModal target={adjust} storeId={storeId} onClose={() => setAdjust(null)}
          onSaved={() => { setAdjust(null); reload(); toast.success(t('inventory.saved')); }} />
      )}
    </div>
  );
}
