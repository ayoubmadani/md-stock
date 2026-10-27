// إعلانات Meta: ربط حساب فيسبوك بالمتجر، الحساب الإعلاني، «تحديث من Meta»، الحملات وربطها بالمنتجات
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Code2, Facebook, Loader2, MousePointerClick, Plus, RefreshCw, Unplug, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/orders';
import { periodRange } from '../lib/periods';
import { timeAgo } from '../components/orders';

const PERIODS = ['today', '7d', '30d', 'month'];
const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4';
const ACTIVE = new Set(['ACTIVE']);

// على الهاتف رابط facebook.com يفتح تطبيق فيسبوك ويترك الصفحة معلّقة: نجهّز الرابط مسبقاً ونفتحه
// في نافذة متصفح مستقلة بنفس الضغطة، وعند الرجوع للتطبيق نعيد قراءة حالة الربط (الحفظ يتم في الخادم)
function Connect({ storeId, onReturn }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const load = () => api.get(`/stores/${storeId}/meta/connect-url`, { params: { app: 'mobile' } }).then(({ data }) => setUrl(data.url)).catch(() => setUrl(null));
    load();
    const timer = setInterval(load, 10 * 60_000); // صلاحية الرابط 15 دقيقة
    return () => clearInterval(timer);
  }, [storeId]);
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') { setBusy(false); onReturn?.(); } };
    document.addEventListener('visibilitychange', back);
    window.addEventListener('pageshow', back);
    return () => { document.removeEventListener('visibilitychange', back); window.removeEventListener('pageshow', back); };
  }, [onReturn]);
  const go = async () => {
    if (url && window.open(url, '_blank')) return;
    setBusy(true);
    try {
      const { data } = await api.get(`/stores/${storeId}/meta/connect-url`, { params: { app: 'mobile' } });
      window.location.href = data.url;
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
      setBusy(false);
    }
  };
  return (
    <div className={`${box} text-center space-y-4 py-8`}>
      <span className="mx-auto w-14 h-14 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center"><Facebook className="w-7 h-7" /></span>
      <div className="space-y-1">
        <p className="font-bold">{t('meta.connect_title')}</p>
        <p className="text-sm text-gray-500 leading-relaxed">{t('meta.connect_hint')}</p>
      </div>
      <button type="button" onClick={go} disabled={busy} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1877F2] text-white font-bold disabled:opacity-60">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}{t('meta.connect')}
      </button>
    </div>
  );
}

export default function MetaPage() {
  const { t, i18n } = useTranslation();
  const { storeId } = useAuth();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [rate, setRate] = useState('');
  const [period, setPeriod] = useState('7d');
  const [campaigns, setCampaigns] = useState(null);
  const [products, setProducts] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [pixels, setPixels] = useState(null);
  const [adding, setAdding] = useState(null);
  const [newPixel, setNewPixel] = useState(null); // null = مغلق، نص = اسم البكسل الجديد

  const loadStatus = useCallback(() => api.get(`/stores/${storeId}/meta`).then((r) => { setStatus(r.data); setRate(r.data.usdRate ? String(r.data.usdRate) : ''); }).catch(() => setStatus({ connected: false })), [storeId]);
  useEffect(() => { loadStatus(); }, [loadStatus]);

  // الرجوع من فيسبوك
  useEffect(() => {
    const m = params.get('meta');
    if (!m) return;
    if (m === 'connected') toast.success(t('meta.connected')); else toast.error(`${t('meta.connect_failed')}${params.get('reason') ? ` — ${params.get('reason')}` : ''}`);
    setParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!status?.connected) return;
    if (!status.adAccountId) api.get(`/stores/${storeId}/meta/ad-accounts`).then((r) => setAccounts(r.data)).catch((e) => { setAccounts([]); toast.error(errorMessage(e, t('inventory.error'))); });
    api.get(`/stores/${storeId}/products`).then((r) => setProducts(r.data?.products || r.data?.data || [])).catch(() => {});
  }, [status?.connected, status?.adAccountId, storeId, t]);

  // بكسلات الحساب الإعلاني
  const loadPixels = useCallback(() => {
    if (!status?.adAccountId) return;
    api.get(`/stores/${storeId}/meta/pixels`).then((r) => setPixels(r.data)).catch(() => setPixels([]));
  }, [storeId, status?.adAccountId]);
  useEffect(() => { loadPixels(); }, [loadPixels]);
  const addPixel = async (px) => {
    setAdding(px.id);
    try {
      await api.post(`/stores/${storeId}/meta/pixels/${px.id}`);
      toast.success(t('meta.pixel_added'));
      setPixels((l) => l.map((x) => (x.id === px.id ? { ...x, added: true } : x)));
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    } finally {
      setAdding(null);
    }
  };

  const createPixel = async () => {
    setAdding('new');
    try {
      await api.post(`/stores/${storeId}/meta/pixels`, { name: newPixel });
      toast.success(t('meta.pixel_created'));
      setNewPixel(null);
      setPixels(null);
      loadPixels();
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    } finally {
      setAdding(null);
    }
  };

  const loadCampaigns = useCallback(() => {
    if (!status?.adAccountId) return;
    const { from, to } = periodRange(period);
    api.get(`/stores/${storeId}/meta/campaigns`, { params: { from, to } }).then((r) => setCampaigns(r.data)).catch(() => setCampaigns([]));
  }, [storeId, period, status?.adAccountId]);
  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const pickAccount = async (id) => {
    try { const { data } = await api.put(`/stores/${storeId}/meta/ad-account`, { adAccountId: id }); setStatus(data); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };
  const saveRate = async () => {
    if (!rate) return;
    try { const { data } = await api.patch(`/stores/${storeId}/meta/rate`, { usdRate: Number(rate) }); setStatus(data); loadCampaigns(); toast.success(t('inventory.saved')); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };
  const sync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post(`/stores/${storeId}/meta/sync`);
      toast.success(t('meta.synced', { campaigns: data.campaigns }));
      await loadStatus();
      loadCampaigns();
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    } finally {
      setSyncing(false);
    }
  };
  const link = async (c, productId) => {
    try {
      await api.put(`/stores/${storeId}/meta/campaigns/${c.campaignId}/product`, { productId: productId || null });
      setCampaigns((l) => l.map((x) => (x.campaignId === c.campaignId ? { ...x, productId } : x)));
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };
  const disconnect = async () => {
    if (!window.confirm(t('meta.confirm_disconnect'))) return;
    try { await api.delete(`/stores/${storeId}/meta`); setStatus({ connected: false }); setCampaigns(null); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };

  if (!status) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!status.connected) return <div className="max-w-xl mx-auto"><Connect storeId={storeId} onReturn={loadStatus} /></div>;

  const usd = status.currency && status.currency !== 'DZD';
  return (
    <div className="max-w-xl mx-auto space-y-3">
      {/* الحساب */}
      <div className={`${box} space-y-3`}>
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shrink-0"><Facebook className="w-5 h-5" /></span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate"><bdi>{status.fbUserName}</bdi></p>
            <p className="text-xs text-gray-400 truncate">{status.adAccountName ? <bdi>{status.adAccountName} · {status.currency}</bdi> : t('meta.pick_account')}</p>
          </div>
          <button type="button" onClick={disconnect} title={t('meta.disconnect')} className="p-2 rounded-lg text-gray-400 hover:text-rose-500"><Unplug className="w-4 h-4" /></button>
        </div>
        {!status.adAccountId && (
          accounts === null ? <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            : accounts.length === 0 ? <p className="text-sm text-gray-500">{t('meta.no_accounts')}</p>
            : (
              <div className="space-y-2">
                {accounts.map((a) => (
                  <button key={a.id} type="button" onClick={() => pickAccount(a.id)} className="w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 text-start">
                    <span className="min-w-0"><span className="block text-sm font-semibold truncate"><bdi>{a.name}</bdi></span><span className="block text-xs text-gray-400" dir="ltr">{a.id} · {a.currency}</span></span>
                    {!a.active && <span className="text-[11px] text-amber-600">{t('meta.inactive')}</span>}
                  </button>
                ))}
              </div>
            )
        )}
        {status.adAccountId && usd && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 flex-1">{t('meta.usd_rate')}</span>
            <input type="number" inputMode="decimal" dir="ltr" value={rate} onChange={(e) => setRate(e.target.value)} onBlur={saveRate} placeholder="260"
              className="w-24 px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-400" />
            <span className="text-xs text-gray-400">DA</span>
          </div>
        )}
        {status.adAccountId && (
          <button type="button" onClick={sync} disabled={syncing} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />{t('meta.sync')}
          </button>
        )}
        {status.lastSyncAt && <p className="text-[11px] text-gray-400 text-center">{t('meta.last_sync', { ago: timeAgo(status.lastSyncAt, i18n.language) })}</p>}
      </div>

      {/* البكسلات */}
      {status.adAccountId && (
        <div className={`${box} space-y-2 p-3`}>
          <p className="flex items-center gap-2 font-bold text-sm px-1"><Code2 className="w-4 h-4 text-gray-400" />{t('meta.pixels')}</p>
          {pixels === null ? <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            : pixels.length === 0 ? <p className="text-xs text-gray-400 px-1">{t('meta.no_pixels')}</p>
            : pixels.map((px) => (
              <div key={px.id} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-zinc-800 p-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate"><bdi>{px.name}</bdi></p>
                  <p className="text-[11px] text-gray-400" dir="ltr" style={{ textAlign: 'start' }}>{px.id}{px.lastFiredAt ? ` · ${timeAgo(px.lastFiredAt, i18n.language)}` : ''}</p>
                </div>
                {px.added ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><Check className="w-4 h-4" />{t('meta.pixel_in_store')}</span>
                  : <button type="button" disabled={adding === px.id || !px.available} onClick={() => addPixel(px)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">
                      {adding === px.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}{t('meta.add_pixel')}
                    </button>}
              </div>
            ))}
          {newPixel === null
            ? <button type="button" onClick={() => setNewPixel('')} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-sm font-semibold text-indigo-600 dark:text-indigo-400"><Plus className="w-4 h-4" />{t('meta.create_pixel')}</button>
            : (
              <div className="flex gap-2">
                <input autoFocus value={newPixel} onChange={(e) => setNewPixel(e.target.value)} maxLength={100} placeholder={t('meta.pixel_name')} className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-transparent text-sm outline-none focus:border-indigo-500" />
                <button type="button" disabled={adding === 'new'} onClick={createPixel} className="flex items-center gap-1 px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">
                  {adding === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{t('meta.create')}
                </button>
                <button type="button" onClick={() => setNewPixel(null)} className="px-3 rounded-xl text-xs font-bold text-gray-500">{t('meta.cancel')}</button>
              </div>
            )}
          <p className="text-[11px] text-gray-400 px-1 leading-relaxed">{t('meta.pixels_hint')}</p>
        </div>
      )}

      {/* الحملات */}
      {status.adAccountId && (
        <>
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800">
            {PERIODS.map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)} className={`py-2 rounded-lg text-xs font-bold ${period === p ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'text-gray-500'}`}>{t(`profit.period.${p}`)}</button>
            ))}
          </div>
          {usd && !status.usdRate && <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3">{t('meta.need_rate')}</p>}
          {campaigns === null ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            : campaigns.length === 0 ? <p className="text-center text-sm text-gray-400 py-10">{status.lastSyncAt ? t('meta.no_campaigns') : t('meta.sync_first')}</p>
            : campaigns.map((c) => (
              <div key={c.campaignId} className={`${box} space-y-2.5 p-3`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${ACTIVE.has(c.status) ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <p className="flex-1 min-w-0 text-sm font-semibold"><bdi>{c.name}</bdi></p>
                  <div className="text-end shrink-0">
                    <p className="font-black text-sm" dir="ltr">{usd ? `$${money(c.spend)}` : `${money(c.spend)} DA`}</p>
                    {usd && c.spendDzd != null && <p className="text-[11px] text-gray-400" dir="ltr">{money(c.spendDzd)} DA</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{money(c.impressions)}</span>
                  <span className="flex items-center gap-1"><MousePointerClick className="w-3.5 h-3.5" />{money(c.clicks)}</span>
                  {c.impressions > 0 && <span dir="ltr">CTR {((c.clicks / c.impressions) * 100).toFixed(2)}%</span>}
                </div>
                <select value={c.productId || ''} onChange={(e) => link(c, e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none ${c.productId ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-500/10 dark:border-indigo-500/30' : 'border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950'}`}>
                  <option value="">{t('meta.link_product')}</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            ))}
          <p className="text-[11px] text-gray-400 leading-relaxed px-1">{t('meta.profit_note')}</p>
        </>
      )}
    </div>
  );
}
