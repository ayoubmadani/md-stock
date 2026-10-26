// إعلانات منتج: مصروف يومي بالدولار × سعر الدولار بالدينار، من تاريخ إلى تاريخ (أو مستمرة)
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Check, Facebook, Link2, Loader2, Megaphone, Pause, Trash2, Unlink, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { localDate, periodRange } from '../lib/periods';
import { campaignsFor } from '../lib/campaign-links';
import { money } from '../lib/orders';

const input = 'w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400';
const label = 'text-xs font-semibold text-gray-500';

// حملات Meta: ربط حملة بهذا المنتج (مصروفها يدخل في ربحه تلقائياً)
function MetaCampaigns({ storeId, product, onChanged }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(null);
  const [showAll, setShowAll] = useState(false); // المربوطة فقط افتراضياً

  const load = useCallback(() => {
    const { from, to } = periodRange('30d');
    api.get(`/stores/${storeId}/meta/campaigns`, { params: { from, to } }).then((r) => setList(r.data || [])).catch(() => setList([]));
  }, [storeId]);
  useEffect(() => {
    api.get(`/stores/${storeId}/meta`).then((r) => { setStatus(r.data); if (r.data?.adAccountId) load(); }).catch(() => setStatus({ connected: false }));
  }, [storeId, load]);

  const link = async (c, productId) => {
    setBusy(c.campaignId);
    try {
      await api.put(`/stores/${storeId}/meta/campaigns/${c.campaignId}/product`, { productId });
      toast.success(productId ? t('ads.meta_linked') : t('ads.meta_unlinked'));
      load();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
    } finally {
      setBusy(null);
    }
  };

  if (!status) return null;
  if (!status.adAccountId) {
    return (
      <Link to="/meta" className="flex items-center gap-3 rounded-xl bg-[#1877F2]/10 p-3 text-sm">
        <Facebook className="w-5 h-5 text-[#1877F2] shrink-0" />
        <span className="flex-1 text-[#1877F2] dark:text-blue-300 font-semibold">{t('ads.meta_connect')}</span>
      </Link>
    );
  }
  const all = campaignsFor(list, product.id);
  const linkedCount = all.filter((c) => c.link === 'here').length;
  // المربوطة بهذا المنتج فقط — والباقي عند «ربط حملة أخرى» (أو إن لم تُربط أي حملة بعد)
  const rows = showAll || !linkedCount ? all : all.filter((c) => c.link === 'here');
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Facebook className="w-3.5 h-3.5 text-[#1877F2]" />{t('ads.meta_campaigns')}</p>
      {list === null ? <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        : rows.length === 0 ? <p className="text-xs text-gray-400 text-center py-2">{t('ads.meta_none')}</p>
        : rows.map((c) => (
          <div key={c.campaignId} className={`flex items-center gap-3 rounded-xl border p-3 ${c.link === 'here' ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-gray-100 dark:border-zinc-800'}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate"><bdi>{c.name}</bdi></p>
              <p className="text-[11px] text-gray-400 truncate">
                <span dir="ltr">{money(c.spendDzd ?? 0)} DA</span> · {t('ads.meta_30d')}
                {c.link === 'other' && <> · {t('ads.meta_on')} <bdi>{c.productName || '—'}</bdi></>}
              </p>
            </div>
            {c.link === 'here' ? (
              <button type="button" disabled={busy === c.campaignId} onClick={() => link(c, null)} title={t('ads.meta_unlink')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 disabled:opacity-50">
                {busy === c.campaignId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}{t('ads.meta_here')}<Unlink className="w-3.5 h-3.5 ms-1 text-gray-400" />
              </button>
            ) : (
              <button type="button" disabled={busy === c.campaignId} onClick={() => link(c, product.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 ${c.link === 'free' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300'}`}>
                {busy === c.campaignId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}{c.link === 'free' ? t('ads.meta_link') : t('ads.meta_move')}
              </button>
            )}
          </div>
        ))}
      {linkedCount > 0 && all.length > linkedCount && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="w-full py-2 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {showAll ? t('ads.meta_only_linked') : t('ads.meta_link_other', { count: all.length - linkedCount })}
        </button>
      )}
      <p className="text-[11px] text-gray-400 leading-relaxed">{t('ads.meta_hint')}</p>
    </div>
  );
}

export default function AdsSheet({ storeId, product, onClose, onChanged }) {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const [f, setF] = useState({ dailyUsd: '', usdRate: '', startDate: localDate(), endDate: '', ongoing: true });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }));

  const load = useCallback(() => {
    api.get(`/stores/${storeId}/ads`, { params: { productId: product.id } }).then((r) => setList(r.data || [])).catch(() => setList([]));
  }, [storeId, product.id]);
  useEffect(() => { load(); }, [load]);
  // آخر سعر دولار استعمله المتجر
  useEffect(() => {
    api.get(`/stores/${storeId}/ads/last-rate`).then((r) => r.data?.usdRate && setF((s) => (s.usdRate ? s : { ...s, usdRate: String(r.data.usdRate) }))).catch(() => {});
  }, [storeId]);

  const perDay = Number(f.dailyUsd) * Number(f.usdRate);
  const changed = () => { load(); onChanged?.(); };

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/stores/${storeId}/ads`, { productId: product.id, dailyUsd: Number(f.dailyUsd), usdRate: Number(f.usdRate), startDate: f.startDate, endDate: f.ongoing ? null : f.endDate || null });
      toast.success(t('ads.added'));
      setF((s) => ({ ...s, dailyUsd: '' }));
      changed();
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
    } finally {
      setBusy(false);
    }
  };

  const stop = async (c) => {
    try { await api.patch(`/stores/${storeId}/ads/${c.id}`, { endDate: localDate() }); toast.success(t('ads.stopped')); changed(); } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); }
  };
  const remove = async (c) => {
    if (!window.confirm(t('ads.confirm_delete'))) return;
    try { await api.delete(`/stores/${storeId}/ads/${c.id}`); changed(); } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); }
  };

  const today = localDate();
  const date = (d) => String(d).slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92dvh] flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-zinc-800">
          <span className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0"><Megaphone className="w-5 h-5" /></span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{t('ads.title')}</p>
            <p className="text-xs text-gray-400 truncate"><bdi>{product.name}</bdi></p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <MetaCampaigns storeId={storeId} product={product} onChanged={onChanged} />
          <p className={label}>{t('ads.manual')}</p>
          <form onSubmit={add} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={label}>{t('ads.daily_usd')}</label>
                <div className="relative"><input required type="number" inputMode="decimal" step="0.01" min="0.01" dir="ltr" value={f.dailyUsd} onChange={set('dailyUsd')} placeholder="7" className={`${input} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">$</span></div></div>
              <div className="space-y-1.5"><label className={label}>{t('ads.usd_rate')}</label>
                <div className="relative"><input required type="number" inputMode="decimal" step="0.01" min="1" dir="ltr" value={f.usdRate} onChange={set('usdRate')} placeholder="260" className={`${input} pr-11`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">DA</span></div></div>
            </div>
            {perDay > 0 && <p className="text-sm text-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 py-2"><b dir="ltr">{money(perDay)} DA</b> {t('ads.per_day')}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className={label}>{t('ads.start')}</label><input required type="date" value={f.startDate} max={today} onChange={set('startDate')} className={input} /></div>
              <div className="space-y-1.5"><label className={label}>{t('ads.end')}</label>
                <input type="date" value={f.endDate} min={f.startDate} disabled={f.ongoing} onChange={set('endDate')} className={`${input} disabled:opacity-40`} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.ongoing} onChange={set('ongoing')} className="w-4 h-4 accent-indigo-600" />{t('ads.ongoing')}</label>
            <button disabled={busy} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}{t('ads.add')}
            </button>
          </form>

          <div className="space-y-2">
            <p className={label}>{t('ads.history')}</p>
            {list === null && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
            {list?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">{t('ads.none')}</p>}
            {list?.map((c) => {
              const active = !c.endDate || date(c.endDate) >= today;
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-zinc-800 p-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" dir="ltr" style={{ textAlign: 'start' }}>${Number(c.dailyUsd)} × {Number(c.usdRate)} = {money(c.dailyUsd * c.usdRate)} DA</p>
                    <p className="text-xs text-gray-400" dir="ltr" style={{ textAlign: 'start' }}>{date(c.startDate)} → {c.endDate ? date(c.endDate) : t('ads.now')}</p>
                  </div>
                  {active && <button type="button" onClick={() => stop(c)} title={t('ads.stop')} className="p-2 rounded-lg text-amber-600 bg-amber-50 dark:bg-amber-500/10"><Pause className="w-4 h-4" /></button>}
                  <button type="button" onClick={() => remove(c)} className="p-2 rounded-lg text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
