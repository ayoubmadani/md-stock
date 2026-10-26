// شركات التأكيد: المحفوظة (إحصائيات + حساب التوصيل + حذف)، الإرسال التلقائي، والبحث في الدليل بالاسم والولاية
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookmarkPlus, Loader2, MapPin, Phone, PhoneCall, Search, Trash2, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { confirmStats } from '../lib/confirmation';
import { Toggle, input } from '../components/product';

const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80';
const COLORS = { waiting: 'text-amber-600', confirmed: 'text-blue-600', delivered: 'text-emerald-600', cancelled: 'text-rose-600' };

function Company({ c, children, stats }) {
  const { t } = useTranslation();
  return (
    <div className={`${box} p-4 space-y-3`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0"><PhoneCall className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate"><bdi>{c.name}</bdi></p>
          <p className="flex flex-wrap items-center gap-x-3 text-[11px] text-gray-400">
            {c.wilaya && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.wilaya.ar_name}</span>}
            {c.phone && <a href={`tel:${c.phone}`} dir="ltr" className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</a>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-black">{t('confirm.commission', { amount: c.commissionPerDelivered })}</span>
          {(c.blocked || c.paused) && <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 text-[10px] font-bold">{c.blocked ? t('confirm.blocked') : t('confirm.paused')}</span>}
        </div>
      </div>
      {c.description && <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-3 whitespace-pre-line">{c.description}</p>}
      {stats && (
        <div className="grid grid-cols-4 gap-1.5">
          {Object.entries(confirmStats(c.orders)).map(([k, n]) => (
            <div key={k} className="rounded-lg bg-gray-50 dark:bg-zinc-800/60 py-1.5 text-center">
              <p className={`text-sm font-black ${COLORS[k]}`}>{n}</p>
              <p className="text-[10px] text-gray-400">{t(`confirm.s_${k}`)}</p>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

// اختيار حساب التوصيل الذي تُرفع به طلبات الشركة المؤكدة
function AccountSheet({ company, accounts, onClose, onPick, busy }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between"><p className="font-bold"><bdi>{company.name}</bdi></p><button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
        <p className="text-xs text-gray-500">{t('confirm.pick_account')}</p>
        {accounts.map((a) => (
          <button key={a.id} type="button" disabled={busy} onClick={() => onPick(a.id)} className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-zinc-800 text-sm font-semibold hover:border-indigo-300 disabled:opacity-50">
            <span className="truncate"><bdi>{a.accountName || a.providerName}</bdi></span>
            {a.isDefault && <span className="text-[10px] text-amber-600 font-bold">{t('delivery.default')}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [tab, setTab] = useState('saved');
  const [saved, setSaved] = useState(null);
  const [auto, setAuto] = useState({ enabled: false, companyId: null });
  const [accounts, setAccounts] = useState([]);
  const [wilayas, setWilayas] = useState([]);
  const [q, setQ] = useState('');
  const [wilayaId, setWilayaId] = useState('');
  const [results, setResults] = useState(null);
  const [picker, setPicker] = useState(null);
  const [busy, setBusy] = useState(null);

  const loadSaved = useCallback(() => {
    api.get(`/stores/${storeId}/confirmation/saved`).then((r) => setSaved(r.data ?? [])).catch(() => setSaved([]));
    api.get(`/stores/${storeId}/confirmation/auto`).then((r) => setAuto(r.data)).catch(() => {});
  }, [storeId]);
  useEffect(() => {
    setSaved(null); loadSaved();
    api.get(`/stores/${storeId}/shipping/accounts`).then((r) => setAccounts(Array.isArray(r.data) ? r.data : [])).catch(() => setAccounts([]));
  }, [storeId, loadSaved]);
  useEffect(() => { api.get('/shipping/wilayas').then((r) => setWilayas(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, []);
  useEffect(() => {
    if (tab !== 'search') return undefined;
    setResults(null);
    const id = setTimeout(() => {
      api.get('/confirmation/directory', { params: { search: q.trim() || undefined, wilayaId: wilayaId || undefined, storeId } })
        .then((r) => setResults(r.data ?? [])).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(id);
  }, [tab, q, wilayaId, storeId]);

  const updateAuto = async (next) => {
    setBusy('auto');
    try { const { data } = await api.put(`/stores/${storeId}/confirmation/auto`, next); setAuto(data); toast.success(t('confirm.auto_saved')); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const askSave = (c) => {
    if (!accounts.length) return toast.error(t('confirm.no_account'));
    if (accounts.length === 1) return saveWith(c, accounts[0].id);
    setPicker(c);
  };
  const saveWith = async (c, shippingAccountId) => {
    setBusy(c.id);
    try {
      await api.post(`/stores/${storeId}/confirmation/saved/${c.id}`, { shippingAccountId });
      setResults((r) => r?.map((x) => (x.id === c.id ? { ...x, saved: true } : x)));
      setPicker(null); toast.success(t('confirm.saved_ok')); loadSaved();
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const remove = async (c) => {
    if (!window.confirm(t('confirm.remove_q', { name: c.name }))) return;
    setBusy(c.id);
    try { await api.delete(`/stores/${storeId}/confirmation/saved/${c.id}`); loadSaved(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900">
        {['saved', 'search'].map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`py-2 rounded-lg text-sm font-bold ${tab === k ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-gray-500'}`}>{t(`confirm.tab_${k}`)}{k === 'saved' && saved?.length ? ` (${saved.length})` : ''}</button>
        ))}
      </div>

      {tab === 'saved' && (saved === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> : (
        <>
          {/* الإرسال التلقائي لكل طلب جديد */}
          {saved.length > 0 && (
            <div className={`${box} p-4 space-y-3`}>
              <div className="flex items-center gap-2"><Zap className={`w-5 h-5 ${auto.enabled ? 'text-amber-500' : 'text-gray-400'}`} /><p className="flex-1 font-bold text-sm">{t('confirm.auto')}</p>
                <span className={busy === 'auto' || !auto.companyId ? 'opacity-40 pointer-events-none' : ''}><Toggle checked={!!auto.enabled} onChange={() => updateAuto({ enabled: !auto.enabled, companyId: auto.companyId || undefined })} /></span>
              </div>
              <select value={auto.companyId ?? ''} disabled={busy === 'auto'} onChange={(e) => updateAuto({ enabled: !!e.target.value && auto.enabled, companyId: e.target.value || undefined })} className={input}>
                <option value="">{t('confirm.auto_pick')}</option>
                {saved.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-[11px] text-gray-400">{t('confirm.auto_hint')}</p>
            </div>
          )}
          {saved.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-14 text-gray-400 text-center"><PhoneCall className="w-10 h-10" /><p className="text-sm max-w-xs">{t('confirm.empty')}</p>
              <button type="button" onClick={() => setTab('search')} className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">{t('confirm.find')}</button></div>
          ) : saved.map((c) => (
            <Company key={c.id} c={c} stats>
              <div className="flex items-center gap-2">
                <select value={c.shippingAccountId ?? ''} disabled={busy === c.id || !accounts.length} onChange={(e) => e.target.value && saveWith(c, e.target.value)} className={`${input} py-2 text-sm`}>
                  {!c.shippingAccountId && <option value="">{t('confirm.pick_account')}</option>}
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName || a.providerName}</option>)}
                </select>
                <button type="button" disabled={busy === c.id} onClick={() => remove(c)} className="p-2.5 rounded-xl text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </Company>
          ))}
          {!accounts.length && <Link to="/delivery" className="block text-center text-xs font-semibold text-indigo-600">{t('confirm.no_account')}</Link>}
        </>
      ))}

      {tab === 'search' && (
        <>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('confirm.search')} className={`${input} ps-9`} />
          </div>
          <select value={wilayaId} onChange={(e) => setWilayaId(e.target.value)} className={input}>
            <option value="">{t('confirm.all_wilayas')}</option>
            {wilayas.map((w) => <option key={w.id} value={w.id}>({w.id}) {w.ar_name || w.name}</option>)}
          </select>
          {results === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            : results.length === 0 ? <p className="text-center text-sm text-gray-400 py-12">{t('confirm.no_results')}</p>
            : results.map((c) => (
              <Company key={c.id} c={c}>
                {c.saved ? <p className="text-center text-xs font-bold text-emerald-600">{t('confirm.already')}</p> : (
                  <button type="button" disabled={busy === c.id || c.blocked || c.paused} onClick={() => askSave(c)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
                    {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookmarkPlus className="w-4 h-4" />}{t('confirm.save')}
                  </button>
                )}
              </Company>
            ))}
        </>
      )}

      {picker && <AccountSheet company={picker} accounts={accounts} busy={busy === picker.id} onClose={() => setPicker(null)} onPick={(id) => saveWith(picker, id)} />}
    </div>
  );
}
