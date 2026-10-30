// الدومين: معلومات الربط في الأعلى، رابط المتجر، الدومينات المخصصة (تحقق / حذف)، وربط دومين جديد ضمن حد الخطة
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, ExternalLink, Globe, LayoutTemplate, Link2, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { normalizeDomain } from '../lib/store-setup';
import { DNS_RECORD, splitDomains } from '../lib/domains';

const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80';

function CopyRow({ label, value }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); } catch { /* المتصفح منع النسخ */ }
  };
  return (
    <button type="button" onClick={copy} className="flex items-center gap-3 w-full px-3 py-2.5 text-start">
      <span className="w-14 shrink-0 text-xs font-semibold text-gray-500">{label}</span>
      <span className="flex-1 font-mono font-bold text-[15px] text-start" dir="ltr">{value}</span>
      {done ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 text-indigo-500 shrink-0" />}
    </button>
  );
}

// سطر دومين: الحالة، الاسم، وزر تحقق للمنتظر؛ دومين النظام يُفتح ولا يُحذف
function DomainRow({ d, system, busy, onCheck, onRemove }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${d.isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate"><bdi dir="ltr">{d.domain}</bdi></p>
        <p className="flex items-center gap-1.5 mt-0.5 text-[11px] font-semibold">
          <span className={d.isActive ? 'text-gray-500' : 'text-amber-500'}>{d.isActive ? t('domains.status_active') : t('domains.status_pending')}</span>
          {d.scope === 'landing_page' && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-500/10"><LayoutTemplate className="w-3 h-3" />{t('domains.landing_page')}</span>}
        </p>
      </div>
      {!system && !d.isActive && (
        <button type="button" disabled={busy} onClick={onCheck} className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-xs font-bold disabled:opacity-60">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}{t('domains.check')}
        </button>
      )}
      {system
        ? <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-gray-400" aria-label={d.domain}><ExternalLink className="w-4 h-4" /></a>
        : <button type="button" disabled={busy} onClick={onRemove} className="shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-xs font-bold disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" />{t('domains.delete')}</button>}
    </div>
  );
}

export default function DomainsPage() {
  const { t } = useTranslation();
  const { storeId, isOwner } = useAuth();
  const [domains, setDomains] = useState(null);
  const [limit, setLimit] = useState(null);
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);
  const [sheet, setSheet] = useState(false);

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
      setSheet(false);
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
  const { system, custom } = splitDomains(domains);
  const row = (d, isSystem) => <DomainRow key={d.id} d={d} system={isSystem} busy={busy === d.id} onCheck={() => check(d)} onRemove={() => remove(d)} />;

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold">{t('nav.domains')}</h1>
        {limit != null && <span className={`text-xs font-bold px-2 py-1 rounded-lg ${full ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`} dir="ltr">{domains.length} / {limit}</span>}
      </div>

      {/* معلومات الربط: نفس السجل لكل الدومينات */}
      <div className={`${box} border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-b from-indigo-50/60 dark:from-indigo-500/10 p-4 space-y-3`}>
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0"><Link2 className="w-5 h-5" /></span>
          <div>
            <p className="font-bold">{t('domains.connect_title')}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{t('domains.connect_desc')}</p>
          </div>
        </div>
        <div className="rounded-xl bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
          {DNS_RECORD.map(([k, v]) => <CopyRow key={k} label={t(`domains.field_${k}`)} value={v} />)}
        </div>
        <p className="text-[11px] text-gray-400">{t('domains.dns_note')}</p>
      </div>

      {system.length > 0 && (
        <>
          <p className="px-1 pt-2 text-xs font-bold text-gray-400">{t('domains.my_link')}</p>
          <div className={`${box} divide-y divide-gray-100 dark:divide-zinc-800`}>{system.map((d) => row(d, true))}</div>
        </>
      )}

      <p className="px-1 pt-2 text-xs font-bold text-gray-400">{t('domains.custom')}</p>
      {custom.length === 0
        ? <div className="flex flex-col items-center gap-2 py-8 text-gray-400"><Globe className="w-8 h-8" /><p className="text-sm">{t('domains.empty')}</p></div>
        : <div className={`${box} divide-y divide-gray-100 dark:divide-zinc-800`}>{custom.map((d) => row(d, false))}</div>}

      {full ? (
        <p className="rounded-xl bg-gray-100 dark:bg-zinc-900 px-4 py-3 text-center text-xs text-gray-500">
          {t('domains.limit_short', { limit })}{isOwner && <> — <Link to="/subscription" className="font-bold text-indigo-600 dark:text-indigo-400">{t('domains.upgrade')}</Link></>}
        </p>
      ) : (
        <button type="button" onClick={() => setSheet(true)} className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400">
          <Plus className="w-4 h-4" />{t('domains.add_new')}
        </button>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && setSheet(false)}>
          <form onSubmit={add} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <p className="font-bold">{t('domains.add_new')}</p>
              <button type="button" onClick={() => setSheet(false)} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" placeholder="example.com" inputMode="url" autoCapitalize="none" autoCorrect="off"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400" />
            <p className="text-[11px] text-gray-400">{t('domains.add_hint')}</p>
            <button disabled={adding || !value.trim()} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}{t('domains.add')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
