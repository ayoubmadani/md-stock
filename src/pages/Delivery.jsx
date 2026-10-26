// شركات التوصيل: حسابات المتجر (افتراضي، حذف) + ربط حساب جديد (اختيار الشركة، المفاتيح، اختبار ثم حفظ)
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronLeft, Loader2, Plus, Search, Star, Trash2, Truck, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canSave, credentialKeys } from '../lib/shipping-accounts';
import { input, label } from '../components/product';

function Logo({ p, size = 'w-11 h-11' }) {
  return (
    <span className={`${size} rounded-xl overflow-hidden bg-white border border-gray-100 dark:border-zinc-800 shrink-0 flex items-center justify-center`}>
      {p?.logo ? <img src={p.logo} alt="" className="w-full h-full object-contain p-1" /> : <Truck className="w-5 h-5 text-gray-400" />}
    </span>
  );
}

function AddSheet({ storeId, providers, onClose, onSaved }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [name, setName] = useState('');
  const [creds, setCreds] = useState({});
  const [test, setTest] = useState(null);
  const [busy, setBusy] = useState(null);
  const body = () => ({ providerName: sel.name, credentials: creds, accountName: name.trim() });

  const runTest = async () => {
    setBusy('test'); setTest(null);
    try { const { data } = await api.post(`/stores/${storeId}/shipping/settings`, body()); setTest(data?.isVerified ? 'ok' : 'fail'); } catch { setTest('fail'); } finally { setBusy(null); }
  };
  const save = async () => {
    setBusy('save');
    try { await api.post(`/stores/${storeId}/shipping/accounts`, body()); toast.success(t('delivery.added')); onSaved(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); setBusy(null); }
  };
  const list = providers.filter((p) => `${p.title} ${p.name}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92dvh] flex flex-col">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-zinc-800">
          {sel && <button type="button" onClick={() => { setSel(null); setTest(null); }} className="p-1.5 rounded-lg text-gray-400"><ChevronLeft className="w-5 h-5 rtl:rotate-180" /></button>}
          <p className="flex-1 font-bold">{sel ? sel.title : t('delivery.pick')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!sel ? (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('delivery.search')} className={`${input} ps-9`} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {list.map((p) => (
                  <button key={p.name} type="button" onClick={() => { setSel(p); setName(p.title); setCreds({}); }} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800 text-start hover:border-indigo-300">
                    <Logo p={p} size="w-9 h-9" /><span className="text-sm font-semibold truncate">{p.title}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3"><Logo p={sel} /><p className="text-xs text-gray-500 leading-relaxed">{sel.description}</p></div>
              <div className="space-y-1.5"><label className={label}>{t('delivery.account_name')}</label><input value={name} onChange={(e) => setName(e.target.value)} className={input} /></div>
              {credentialKeys(sel.name).map((k) => (
                <div key={k} className="space-y-1.5">
                  <label className={label}>{k === 'id' ? 'API ID' : k === 'key' ? 'API Key' : 'API Token'}</label>
                  <input dir="ltr" type="password" autoComplete="off" value={creds[k] || ''} onChange={(e) => { setCreds((c) => ({ ...c, [k]: e.target.value })); setTest(null); }} className={input} />
                </div>
              ))}
              {test && (
                <p className={`flex items-center gap-1.5 text-sm font-semibold ${test === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {test === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}{t(`delivery.test_${test}`)}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!canSave(sel.name, name, creds) || !!busy} onClick={runTest} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold disabled:opacity-50">
                  {busy === 'test' && <Loader2 className="w-4 h-4 animate-spin" />}{t('delivery.test')}
                </button>
                <button type="button" disabled={!canSave(sel.name, name, creds) || !!busy} onClick={save} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
                  {busy === 'save' && <Loader2 className="w-4 h-4 animate-spin" />}{t('inventory.save')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeliveryPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [accounts, setAccounts] = useState(null);
  const [providers, setProviders] = useState([]);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    api.get(`/stores/${storeId}/shipping/accounts`).then((r) => setAccounts(r.data ?? [])).catch(() => setAccounts([]));
  }, [storeId]);
  useEffect(() => { setAccounts(null); load(); api.get(`/stores/${storeId}/shipping/providers`).then((r) => setProviders(r.data ?? [])).catch(() => {}); }, [storeId, load]);

  const makeDefault = async (a) => {
    setBusy(a.id);
    try { await api.patch(`/stores/${storeId}/shipping/accounts/${a.id}/default`); load(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const remove = async (a) => {
    if (!window.confirm(t('delivery.confirm_delete', { name: a.accountName }))) return;
    try { await api.delete(`/stores/${storeId}/shipping/accounts/${a.id}`); load(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };
  const provider = (name) => providers.find((p) => p.name === name);

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold">{t('nav.delivery')}</h1>
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold"><Plus className="w-4 h-4" />{t('delivery.add')}</button>
      </div>
      {accounts === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400 text-center"><Truck className="w-10 h-10" /><p className="text-sm max-w-xs">{t('delivery.empty')}</p></div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3">
                <Logo p={provider(a.providerName)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate"><bdi>{a.accountName}</bdi></p>
                  <p className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    {provider(a.providerName)?.title || a.providerName}
                    {a.isVerified ? <span className="text-emerald-600 font-bold">· {t('delivery.verified')}</span> : <span className="text-amber-600 font-bold">· {t('delivery.unverified')}</span>}
                  </p>
                </div>
                {a.isDefault
                  ? <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600"><Star className="w-3.5 h-3.5 fill-current" />{t('delivery.default')}</span>
                  : <button type="button" disabled={busy === a.id} onClick={() => makeDefault(a)} title={t('delivery.make_default')} className="p-2 rounded-lg text-gray-400 hover:text-amber-500">{busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}</button>}
                <button type="button" onClick={() => remove(a)} className="p-2 rounded-lg text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      <p className="text-[11px] text-gray-400 px-1 leading-relaxed">{t('delivery.hint')}</p>
      {adding && <AddSheet storeId={storeId} providers={providers} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}
