import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useInventory } from '../lib/useInventory';
import { StatusBadge, fmt } from '../components/inventory';
import { MovementItem } from './History';
import { STATUS_DOT, sumCounts } from '../lib/orders';

function Card({ label, value, tone = '', sub, to }) {
  const body = (
    <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 h-full">
      <p className={`text-xs ${tone || 'text-gray-500'}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone}`} dir="ltr">{value}</p>
      {sub && <p className="text-[11px] text-emerald-500 mt-0.5" dir="ltr">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function StockSummary() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const { data } = useInventory(storeId);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    if (!storeId) return;
    api.get(`/stores/${storeId}/inventory/movements`, { params: { page: 1 } })
      .then((r) => setRecent(r.data.items.slice(0, 6))).catch(() => setRecent([]));
  }, [storeId]);

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  const tt = data.totals;
  const attention = data.products.filter((p) => p.status !== 'ok').slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label={t('inventory.totals.units')} value={fmt(tt.units)} />
        <Card label={t('inventory.totals.low')} value={fmt(tt.low)} tone="text-amber-500" to="/alerts" />
        <Card label={t('inventory.totals.out')} value={fmt(tt.out)} tone="text-rose-500" to="/alerts" />
        <Card label={t('inventory.totals.products')} value={fmt(tt.products)} to="/stock" />
        <div className="col-span-2"><Card label={t('inventory.totals.value_sell')} value={`${fmt(tt.valueSell)} DA`} /></div>
        <div className="col-span-2">
          <Card label={t('inventory.totals.value_cost')} value={tt.valueCost == null ? '—' : `${fmt(tt.valueCost)} DA`}
            sub={tt.valueCost == null ? null : `${t('inventory.totals.profit')}: ${fmt(tt.valueSell - tt.valueCost)} DA`} />
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t('home.attention')}</h2>
          {attention.length > 0 && <Link to="/alerts" className="text-xs text-indigo-500 font-semibold">{t('home.see_all')}</Link>}
        </div>
        <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-gray-50 dark:divide-zinc-800/60">
          {attention.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">{t('home.all_good')}</p>}
          {attention.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <p className="flex-1 min-w-0 truncate font-semibold">{p.name}</p>
              <StatusBadge status={p.status} />
              <p className="w-10 text-end font-bold" dir="ltr">{fmt(p.stock)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t('home.recent')}</h2>
          <Link to="/history" className="text-xs text-indigo-500 font-semibold">{t('home.see_all')}</Link>
        </div>
        <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-gray-50 dark:divide-zinc-800/60">
          {recent === null && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
          {recent?.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">{t('inventory.history_empty')}</p>}
          {recent?.map((m) => <MovementItem key={m.id} m={m} />)}
        </div>
      </section>
    </div>
  );
}

// عدد الطلبات بكل حالة؛ الضغط يفتح القائمة على تلك الحالة
function OrdersSummary() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (!storeId) return;
    api.get(`/orders/get-count-status/${storeId}`).then((r) => setCounts(sumCounts(r.data))).catch(() => setCounts({}));
  }, [storeId]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{t('nav.orders')}</h2>
        <Link to="/orders" className="text-xs text-indigo-500 font-semibold">{t('home.see_all')}</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {['pending', 'confirmed', 'shipping', 'delivered'].map((s) => (
          <Link key={s} to={`/orders?status=${s}`} className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <p className="flex items-center gap-1.5 text-xs text-gray-500"><span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />{t(`orders.status.${s}`)}</p>
            <p className="text-2xl font-bold mt-1" dir="ltr">{counts ? (counts[s] ?? 0) : '…'}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { can } = useAuth();
  return (
    <div className="space-y-6">
      {can('order.view') && <OrdersSummary />}
      {can('product.crud') && <StockSummary />}
    </div>
  );
}
