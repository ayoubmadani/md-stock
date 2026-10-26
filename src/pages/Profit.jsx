// ربحية المنتجات: لكل منتج في الفترة — المبيعات المسلّمة، التكلفة، الإعلانات، المرتجعات، والربح الصافي
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2, Megaphone, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/orders';
import { periodRange } from '../lib/periods';
import AdsSheet from '../components/AdsSheet';

const PERIODS = ['today', '7d', '30d', 'month'];

function Line({ label, value, tone = '' }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${tone}`} dir="ltr">{value}</span>
    </div>
  );
}

function ProductProfit({ r, onAds }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // ربح القطعة قبل الإعلان (سعر البيع − سعر الشراء): إن تجاوزه إعلان القطعة فكل قطعة تُباع بخسارة
  const unitMargin = r.units && r.cogs != null ? (r.revenue - r.cogs) / r.units : null;
  const unitLoss = r.adPerUnit != null && unitMargin != null && r.adPerUnit > unitMargin;
  const win = r.net != null && r.net > 0;
  const loss = r.net != null && r.net < 0;
  return (
    <div className={`rounded-2xl bg-white dark:bg-zinc-900 border p-3 space-y-3 ${win ? 'border-emerald-200 dark:border-emerald-500/20' : loss ? 'border-rose-200 dark:border-rose-500/20' : 'border-gray-100 dark:border-zinc-800/80'}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 text-start">
        <span className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
          {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate"><bdi>{r.name}</bdi></span>
          <span className="block text-[11px] text-gray-400 mt-0.5">{t('profit.summary', { delivered: r.delivered, orders: r.orders })}
            {r.adPerUnit != null && <> · <span className={`whitespace-nowrap ${unitLoss ? 'text-rose-500 font-bold' : ''}`}>{t('profit.ad_unit_short')} <b dir="ltr">{money(r.adPerUnit)}</b></span></>}
          </span>
        </span>
        <span className="text-end shrink-0">
          {r.net == null ? <span className="text-xs text-amber-600">{t('profit.no_cost')}</span> : (
            <>
              <span className={`flex items-center justify-end gap-1 font-black ${win ? 'text-emerald-600 dark:text-emerald-400' : loss ? 'text-rose-500' : ''}`} dir="ltr">
                {win ? <TrendingUp className="w-4 h-4" /> : loss ? <TrendingDown className="w-4 h-4" /> : null}{money(r.net)}
              </span>
              {r.margin != null && <span className="block text-[11px] text-gray-400" dir="ltr">{r.margin}%</span>}
            </>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-1.5 border-t border-gray-100 dark:border-zinc-800 pt-3">
          <Line label={t('profit.revenue')} value={`+${money(r.revenue)}`} tone="text-emerald-600 dark:text-emerald-400" />
          <Line label={t('profit.cogs', { units: r.units })} value={r.cogs == null ? '—' : `-${money(r.cogs)}`} />
          <Line label={t('profit.ads')} value={`-${money(r.ads)}`} />
          {r.shipping > 0 && <Line label={t('profit.free_shipping')} value={`-${money(r.shipping)}`} />}
          {r.returns > 0 && <Line label={t('profit.returns', { count: r.returned })} value={`-${money(r.returns)}`} />}
          {r.commission > 0 && <Line label={t('profit.commission')} value={`-${money(r.commission)}`} />}
          <div className="border-t border-dashed border-gray-200 dark:border-zinc-700 my-1" />
          <Line label={t('profit.net')} value={r.net == null ? '—' : money(r.net)} tone={win ? 'text-emerald-600' : loss ? 'text-rose-500' : ''} />
          {r.returnRate != null && <Line label={t('profit.return_rate')} value={`${r.returnRate}%`} tone={r.returnRate >= 30 ? 'text-rose-500' : ''} />}
          {r.adPerOrder != null && <Line label={t('profit.ad_per_order')} value={`${money(r.adPerOrder)} DA`} />}
          {r.adPerUnit != null && <Line label={t('profit.ad_per_unit')} value={`${money(r.adPerUnit)} DA`} tone={unitLoss ? 'text-rose-500' : ''} />}
          {unitLoss && <p className="text-[11px] text-rose-500 leading-relaxed">{t('profit.ad_unit_loss', { margin: `\u2066${money(unitMargin)} DA\u2069` })}</p>}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button type="button" onClick={() => onAds(r)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <Megaphone className="w-4 h-4" />{t('ads.title')}
            </button>
            <Link to={`/products/${r.productId}`} className="flex items-center justify-center py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold">
              {r.costPrice == null ? t('profit.set_cost') : t('product.edit')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfitPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [period, setPeriod] = useState('7d');
  const [data, setData] = useState(null);
  const [ads, setAds] = useState(null); // منتج مفتوحة إعلاناته

  const load = useCallback(() => {
    const { from, to } = periodRange(period);
    setData(null);
    api.get(`/stores/${storeId}/reports/profit`, { params: { from, to } }).then((r) => setData(r.data)).catch(() => setData({ totals: {}, products: [] }));
  }, [storeId, period]);
  useEffect(() => { load(); }, [load]);

  const tt = data?.totals || {};
  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800">
        {PERIODS.map((p) => (
          <button key={p} type="button" onClick={() => setPeriod(p)} className={`py-2 rounded-lg text-xs font-bold ${period === p ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'text-gray-500'}`}>{t(`profit.period.${p}`)}</button>
        ))}
      </div>

      {!data ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-3">
              <p className="text-[11px] text-gray-500">{t('profit.revenue')}</p>
              <p className="font-bold mt-1" dir="ltr">{money(tt.revenue)}</p>
            </div>
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-3">
              <p className="text-[11px] text-gray-500">{t('profit.ads')}</p>
              <p className="font-bold mt-1 text-rose-500" dir="ltr">-{money(tt.ads)}</p>
            </div>
            <div className={`rounded-2xl p-3 ${tt.net == null ? 'bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80' : tt.net >= 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
              <p className={`text-[11px] ${tt.net == null ? 'text-gray-500' : 'text-white/80'}`}>{t('profit.net')}</p>
              <p className="font-black mt-1" dir="ltr">{tt.net == null ? '—' : money(tt.net)}</p>
            </div>
          </div>
          {tt.missingCost > 0 && <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3">{t('profit.missing_cost', { count: tt.missingCost })}</p>}

          {data.products.length === 0 ? <p className="text-center text-sm text-gray-400 py-12">{t('profit.empty')}</p>
            : data.products.map((r) => <ProductProfit key={r.productId} r={r} onAds={setAds} />)}
          <p className="text-[11px] text-gray-400 leading-relaxed px-1">{t('profit.note')}</p>
        </>
      )}

      {ads && <AdsSheet storeId={storeId} product={{ id: ads.productId, name: ads.name }} onClose={() => setAds(null)} onChanged={load} />}
    </div>
  );
}
