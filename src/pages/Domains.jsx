// الدومين: سجل CNAME للنسخ، إضافة دومين ضمن حد الخطة، التحقق من التفعيل، الحذف
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, ExternalLink, Globe, LayoutTemplate, Loader2, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { normalizeDomain } from '../lib/store-setup';

// نفس السجل لكل الدومينات (كما في لوحة التاجر)
const DNS = [['type', 'CNAME'], ['host', '@'], ['value', 'mdstore.top'], ['ttl', 'Auto']];
const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4';

function CopyRow({ label, value }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); } catch { /* المتصفح منع النسخ */ }
  };
  return (
    <button type="button" onClick={copy} className="flex items-center justify-between gap-3 w-full px-3 py-2.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="flex items-center gap-2 font-mono font-bold" dir="ltr">{value}{done ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-300" />}</span>
    </button>
  );
}

export default function DomainsPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [domains, setDomains] = useState(null);
  const [limit, setLimit] = useState(null);
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    api.get(`/domain/store/${storeId}`).then((r) => setDomains(r.data || [])).catch(() => setDomains([]));
    api.get(`/domain/limit/${storeId}`).then((r) => setLimit(r.data?.limit ?? null)).catch(() => setLimit(null));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  const full = limit != null && (domains?.length || 0) >= limit;

  const add = async (e) => {
    e.preventDefault();
    const domain = normalizeDomain(value);
    if (!domain) return toast.error(t('domains.invalid'));
    setAdding(true);
    try {
      const { data } = await api.post('/domain', { domain, storeId });
      setDomains((l) => [data, ...(l || [])]);
      setValue('');
      toast.success(t('domains.added'));
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
    } finally {
      setAdding(false);
    }
  };

  const check = async (d) => {
    setBusy(d.id);
    try {
      const { data } = await api.patch(`/domain/sync/${d.id}`, {});
      if (data?.isActive) { setDomains((l) => l.map((x) => (x.id === d.id ? { ...x, isActive: true } : x))); toast.success(t('domains.active')); }
      else toast.warning(t('domains.not_yet'));
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (d) => {
    if (!window.confirm(t('domains.confirm_delete', { domain: d.domain }))) return;
    setBusy(d.id);
    try {
      await api.post(`/domain/delete/${d.id}`, { storeId });
      setDomains((l) => l.filter((x) => x.id !== d.id));
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
    } finally {
      setBusy(null);
    }
  };

  if (!domains) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold">{t('nav.domains')}</h1>
        {limit != null && <span className={`text-xs font-bold px-2 py-1 rounded-lg ${full ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`} dir="ltr">{domains.length} / {limit}</span>}
      </div>

      <form onSubmit={add} className={`${box} space-y-2`}>
        <div className="flex gap-2">
          <input value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" placeholder="example.com" inputMode="url" autoCapitalize="none" autoCorrect="off"
            disabled={full} className="flex-1 min-w-0 px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400 disabled:opacity-50" />
          <button disabled={adding || full || !value.trim()} className="shrink-0 flex items-center gap-1.5 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
            {adding && <Loader2 className="w-4 h-4 animate-spin" />}{t('domains.add')}
          </button>
        </div>
        {full && <p className="text-xs text-rose-500">{t('domains.limit_reached', { limit })}</p>}
      </form>

      <div className={`${box} p-0 overflow-hidden`}>
        <div className="px-4 pt-4 pb-2">
          <p className="font-bold text-sm">{t('domains.dns_title')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t('domains.dns_desc')}</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-zinc-800 border-t border-gray-100 dark:border-zinc-800">
          {DNS.map(([k, v]) => <CopyRow key={k} label={t(`domains.dns_${k}`)} value={v} />)}
        </div>
        <p className="px-4 py-3 text-[11px] text-gray-400 bg-gray-50 dark:bg-zinc-950">{t('domains.dns_note')}</p>
      </div>

      {domains.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-gray-400"><Globe className="w-9 h-9" /><p className="text-sm">{t('domains.empty')}</p></div>
      ) : (
        <div className="space-y-2">
          {domains.map((d) => {
            const system = d.domain.endsWith('.mdstore.top');
            return (
              <div key={d.id} className={`${box} space-y-3`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${d.isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" dir="ltr" className="font-bold text-sm truncate flex items-center gap-1">{d.domain}<ExternalLink className="w-3.5 h-3.5 text-gray-300 shrink-0" /></a>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${d.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'}`}>
                    {d.isActive && <ShieldCheck className="w-3.5 h-3.5" />}{d.isActive ? t('domains.status_active') : t('domains.status_pending')}
                  </span>
                  {system && <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10">{t('domains.system')}</span>}
                  {d.scope === 'landing_page' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10"><LayoutTemplate className="w-3.5 h-3.5" />{t('domains.landing_page')}</span>}
                </div>
                {(
                  <div className="grid grid-cols-2 gap-2">
                    {!system && !d.isActive ? (
                      <button type="button" disabled={busy === d.id} onClick={() => check(d)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-bold disabled:opacity-60">
                        {busy === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}{t('domains.check')}
                      </button>
                    ) : <span />}
                    <button type="button" disabled={busy === d.id} onClick={() => remove(d)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-sm font-bold disabled:opacity-60">
                      <Trash2 className="w-4 h-4" />{t('domains.delete')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
