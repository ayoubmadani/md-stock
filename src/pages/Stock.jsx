import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, CheckSquare, Loader2, Search, Plus, Power, Store, X, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { bulkTargets, toggleId } from '../lib/bulk-select';
import { useInventory } from '../lib/useInventory';
import ProductRow from '../components/ProductRow';
import QuickProductSheet from '../components/QuickProductSheet';
import { AdjustModal } from '../components/inventory';

export default function StockPage({ only }) {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const { data, reload } = useInventory(storeId);
  const [quick, setQuick] = useState(false);
  const [filter, setFilter] = useState(only || 'all');
  const [q, setQ] = useState('');
  const [adjust, setAdjust] = useState(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState([]);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => {
    const list = data?.products || [];
    return { all: list.length, low: list.filter((p) => p.status === 'low').length, out: list.filter((p) => p.status === 'out').length, off: list.filter((p) => p.isActive === false).length };
  }, [data]);

  const rows = useMemo(() => (data?.products || []).filter((p) =>
    (filter === 'all' ? true : filter === 'attention' ? p.status !== 'ok' : filter === 'off' ? p.isActive === false : p.status === filter)
    && (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))), [data, filter, q]);

  const stopSelecting = () => { setSelecting(false); setPicked([]); };
  const allPicked = rows.length > 0 && rows.every((p) => picked.includes(p.id));

  const setState = async (state) => {
    const ids = bulkTargets(data?.products || [], picked, state);
    if (!ids.length) { toast.info(t('inventory.bulk.nothing')); return; }
    setBusy(true);
    try {
      await api.patch(`/stores/${storeId}/products/bulk-active`, { ids, isActive: state === 'active', archived: state === 'off' });
      toast.success(t(`inventory.bulk.done_${state}`, { count: ids.length }));
      stopSelecting();
      reload();
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className={`space-y-4 ${selecting ? 'pb-36' : ''}`}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('inventory.search')}
            className="w-full ps-9 pe-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-indigo-400" />
        </div>
        {!only && (
          <button type="button" onClick={() => setQuick(true)} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold">
            <Zap className="w-4 h-4" />{t('quick.short')}
          </button>
        )}
        {!only && (
          <Link to="/products/new" className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
            <Plus className="w-4 h-4" />{t('product.new')}
          </Link>
        )}
        {!only && (
          <button type="button" onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold border ${selecting ? 'bg-gray-900 text-white border-transparent dark:bg-white dark:text-gray-900' : 'border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-200'}`}>
            <CheckSquare className="w-4 h-4" />{t('inventory.bulk.select')}
          </button>
        )}
        {!only && (
          <div className="flex gap-1.5">
            {['all', 'low', 'out', 'off'].map((f) => (
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
          {rows.map((p) => <ProductRow key={p.id} p={p} storeId={storeId} onAdjust={setAdjust} onChanged={reload}
            selecting={selecting} selected={picked.includes(p.id)} onSelect={(id) => setPicked((l) => toggleId(l, id))} />)}
        </div>
      )}

      {selecting && (
        <div className="fixed inset-x-3 bottom-24 md:bottom-6 md:start-auto md:end-6 md:w-[480px] z-40 p-2.5 space-y-2 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl">
          <div className="flex items-center gap-2">
            <button type="button" onClick={stopSelecting} className="p-1.5 rounded-xl text-gray-400" aria-label="×"><X className="w-5 h-5" /></button>
            <p className="flex-1 text-sm font-bold">{t('inventory.bulk.count', { count: picked.length })}</p>
            <button type="button" onClick={() => setPicked(allPicked ? [] : rows.map((p) => p.id))} className="px-2 text-xs text-indigo-600 font-semibold">
              {t(allPicked ? 'inventory.bulk.none' : 'inventory.bulk.all')}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              ['active', Power, 'bg-emerald-600 text-white'],
              ['store_off', Store, 'bg-gray-100 dark:bg-zinc-800'],
              ['off', Ban, 'bg-red-50 text-red-600 dark:bg-red-500/10'],
            ].map(([state, Icon, cls]) => (
              <button key={state} type="button" disabled={!picked.length || busy} onClick={() => setState(state)}
                className={`flex flex-col items-center gap-1 px-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40 ${cls}`}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}{t(`inventory.bulk.to_${state}`)}
              </button>
            ))}
          </div>
        </div>
      )}
      {adjust && (
        <AdjustModal target={adjust} storeId={storeId} onClose={() => setAdjust(null)}
          onSaved={() => { setAdjust(null); reload(); toast.success(t('inventory.saved')); }} />
      )}
      {quick && <QuickProductSheet storeId={storeId} onClose={() => setQuick(false)} onCreated={() => { setQuick(false); reload(); }} />}
    </div>
  );
}
