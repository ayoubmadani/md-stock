// الدومين: معلومات الربط في الأعلى، ثم تبويبات (روابط المتجر / المخصصة / صفحات الهبوط) بأزرار تحقق، ربط، فسخ، حذف
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Search, ExternalLink, Globe, LayoutTemplate, Link2, Loader2, Plus, RefreshCw, Trash2, Unlink, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { normalizeDomain } from '../lib/store-setup';
import { DNS_RECORD, filterDomains, groupDomains } from '../lib/domains';

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

const btn = 'shrink-0 w-7 h-7 flex items-center justify-center rounded-lg disabled:opacity-60';

// سطر دومين (أو رابط فرعي .mdstore.top بنفس المعاملة): الحالة والاسم وصفحة الهبوط المربوطة، وأيقونات في نفس السطر:
// تحقق (للدومين المنتظر فقط — الرابط الفرعي متصل دائماً)، ربط، فسخ، نسخ، فتح، حذف
function DomainRow({ d, page, busy, onCheck, onLink, onUnlink, onRemove }) {
  const { t } = useTranslation();
  const sub = d.domain.endsWith('.mdstore.top');
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`https://${d.domain}`); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* المتصفح منع النسخ */ }
  };
  return (
    <div className="px-3 py-2 space-y-1">
      {/* السطر الأول: الدومين كاملاً */}
      <p className="flex items-center gap-2 font-bold text-sm min-w-0">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${d.isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
        <span className="truncate"><bdi dir="ltr">{d.domain}</bdi></span>
      </p>
      {/* السطر الثاني: الحالة وصفحة الهبوط، والأيقونات */}
      <div className="flex items-center gap-1.5">
        <p className="flex-1 flex items-center gap-1.5 text-[11px] font-semibold min-w-0 ps-4">
          <span className={`shrink-0 ${d.isActive ? 'text-gray-500' : 'text-amber-500'}`}>{d.isActive ? t('domains.status_active') : t('domains.status_pending')}</span>
          {d.scope === 'landing_page' && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-500/10 min-w-0"><LayoutTemplate className="w-3 h-3 shrink-0" /><span className="truncate">{d.builderPage?.name || page?.name || (d.splitTestId ? t('domains.split_test') : t('domains.landing_page'))}</span></span>}
        </p>
      {!sub && !d.isActive && (
          <button type="button" disabled={busy} onClick={onCheck} title={t('domains.check')} aria-label={t('domains.check')} className={`${btn} bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300`}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        )}
        {d.scope !== 'landing_page' && (
          <button type="button" disabled={busy} onClick={onLink} title={t('domains.link')} aria-label={t('domains.link')} className={`${btn} bg-purple-50 dark:bg-purple-500/10 text-purple-600`}><Link2 className="w-3.5 h-3.5" /></button>
        )}
        {d.scope === 'landing_page' && (
          <button type="button" disabled={busy} onClick={onUnlink} title={t('domains.unlink')} aria-label={t('domains.unlink')} className={`${btn} bg-amber-50 dark:bg-amber-500/10 text-amber-600`}><Unlink className="w-3.5 h-3.5" /></button>
        )}
        <button type="button" onClick={copy} title={t('domains.copy')} aria-label={t('domains.copy')} className={`${btn} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600`}>{copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
        <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" title={d.domain} aria-label={d.domain} className={`${btn} bg-gray-100 dark:bg-zinc-800 text-gray-500`}><ExternalLink className="w-3.5 h-3.5" /></a>
        <button type="button" disabled={busy} onClick={onRemove} title={t('domains.delete')} aria-label={t('domains.delete')} className={`${btn} bg-rose-50 dark:bg-rose-500/10 text-rose-600`}><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

const TABS = ['store', 'custom', 'pages'];

export default function DomainsPage() {
  const { t } = useTranslation();
  const { storeId, isOwner } = useAuth();
  const [domains, setDomains] = useState(null);
  const [limit, setLimit] = useState(null);
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState('store');
  const [pages, setPages] = useState([]);
  const [linking, setLinking] = useState(null); // الدومين الذي نختار له صفحة هبوط
  const [info, setInfo] = useState(false); // نافذة معلومات الربط
  const [q, setQ] = useState('');
  const [target, setTarget] = useState(''); // دومين جديد: '' = المتجر، وإلا معرّف صفحة الهبوط

  const load = useCallback(() => {
    api.get(`/domain/store/${storeId}`).then((r) => setDomains(r.data || [])).catch(() => setDomains([]));
    api.get(`/domain/limit/${storeId}`).then((r) => setLimit(r.data?.limit ?? null)).catch(() => setLimit(null));
    api.get(`/builder-pages/store/${storeId}`).then((r) => setPages(Array.isArray(r.data) ? r.data : r.data?.data ?? [])).catch(() => setPages([]));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  const full = limit != null && (domains?.length || 0) >= limit;

  const add = async (e) => {
    e.preventDefault();
    const domain = normalizeDomain(value);
    if (!domain) return toast.error(t('domains.invalid'));
    setAdding(true);
    try {
      let { data } = await api.post('/domain', { domain, storeId });
      // لصفحة هبوط: يُربط بها مباشرة بعد الإنشاء
      if (target) {
        const r = await api.patch(`/domain/${data.id}/assign-page`, { builderPageId: target, storeId });
        data = { ...data, ...r.data, scope: 'landing_page', builderPageId: target };
      }
      setDomains((l) => [data, ...(l || [])]);
      setValue('');
      setSheet(false);
      setTab(target ? 'pages' : data.domain.endsWith('.mdstore.top') ? 'store' : 'custom');
      setTarget('');
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

  // ربط دومين مخصص بصفحة هبوط، أو فسخه (يعود دومين متجر)
  const link = async (d, pageId) => {
    setBusy(d.id);
    try {
      const { data } = await api.patch(`/domain/${d.id}/assign-page`, { builderPageId: pageId, storeId });
      setDomains((l) => l.map((x) => (x.id === d.id ? { ...x, ...data, scope: 'landing_page', builderPageId: pageId } : x)));
      setLinking(null);
      setTab('pages');
      toast.success(t('domains.linked'));
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
    } finally {
      setBusy(null);
    }
  };
  const unlink = async (d) => {
    if (!window.confirm(t('domains.confirm_unlink', { domain: d.domain }))) return;
    setBusy(d.id);
    try {
      await api.patch(`/domain/${d.id}/unassign-page`, { storeId });
      setDomains((l) => l.map((x) => (x.id === d.id ? { ...x, scope: 'store', builderPageId: null } : x)));
      toast.success(t('domains.unlinked'));
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
    } finally {
      setBusy(null);
    }
  };

  if (!domains) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  const groups = groupDomains(filterDomains(domains, q, pages));
  const shown = groups[tab];

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold">{t('nav.domains')}</h1>
        {limit != null && <span className={`text-xs font-bold px-2 py-1 rounded-lg ${full ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`} dir="ltr">{domains.length} / {limit}</span>}
      </div>

      {/* معلومات الربط: سطر صغير، وزر «إظهار» يفتح نافذة السجل */}
      <div className={`${box} border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-b from-indigo-50/60 dark:from-indigo-500/10 px-3 py-2.5 flex items-center gap-3`}>
        <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0"><Link2 className="w-4 h-4" /></span>
        <p className="flex-1 font-bold text-sm">{t('domains.connect_title')}</p>
        <button type="button" onClick={() => setInfo(true)} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-100/70 dark:bg-indigo-500/15">{t('domains.show_info')}</button>
      </div>

      {/* تبويبات القائمة */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900">
        {TABS.map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`py-2 rounded-lg text-xs font-bold ${tab === k ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-gray-500'}`}>
            {t(`domains.tab_${k}`)} <span className="opacity-60" dir="ltr">{groups[k].length}</span>
          </button>
        ))}
      </div>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder={t('domains.search')}
          className="w-full ps-9 pe-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-indigo-400" />
      </div>

      {/* صندوق ثابت الارتفاع: التمرير داخله، فلا تقفز الصفحة عند تغيير التبويب */}
      <div className={`${box} h-[260px] overflow-y-auto overscroll-contain divide-y divide-gray-100 dark:divide-zinc-800`}>
        {shown.length === 0
          ? <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400"><Globe className="w-8 h-8" /><p className="text-sm">{t('domains.empty')}</p></div>
          : shown.map((d) => (
            <DomainRow key={d.id} d={d} page={pages.find((p) => p.id === d.builderPageId)} busy={busy === d.id}
              onCheck={() => check(d)} onLink={() => setLinking(d)} onUnlink={() => unlink(d)} onRemove={() => remove(d)} />
          ))}
      </div>

      {full ? (
        <p className="rounded-xl bg-gray-100 dark:bg-zinc-900 px-4 py-3 text-center text-xs text-gray-500">
          {t('domains.limit_short', { limit })}{isOwner && <> — <Link to="/subscription" className="font-bold text-indigo-600 dark:text-indigo-400">{t('domains.upgrade')}</Link></>}
        </p>
      ) : (
        <button type="button" onClick={() => setSheet(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400">
          <Plus className="w-4 h-4" />{t('domains.add_new')}
        </button>
      )}

      {info && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && setInfo(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0"><Link2 className="w-5 h-5" /></span>
              <div className="flex-1">
                <p className="font-bold">{t('domains.connect_title')}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{t('domains.connect_desc')}</p>
              </div>
              <button type="button" onClick={() => setInfo(false)} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
              {DNS_RECORD.map(([k, v]) => <CopyRow key={k} label={t(`domains.field_${k}`)} value={v} />)}
            </div>
            <p className="text-[11px] text-gray-400">{t('domains.dns_note')}</p>
          </div>
        </div>
      )}
      {linking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && setLinking(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[80dvh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="font-bold">{t('domains.link_title')}</p>
                <p className="text-xs text-gray-400 truncate"><bdi dir="ltr">{linking.domain}</bdi></p>
              </div>
              <button type="button" onClick={() => setLinking(null)} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {pages.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">{t('domains.no_pages')}</p> : pages.map((p) => (
                <button key={p.id} type="button" disabled={busy === linking.id} onClick={() => link(linking, p.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 text-start text-sm font-semibold disabled:opacity-50">
                  <LayoutTemplate className="w-4 h-4 text-purple-500 shrink-0" /><span className="flex-1 truncate"><bdi>{p.name}</bdi></span>
                </button>
              ))}
            </div>
          </div>
        </div>
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
            {/* لمن الدومين: المتجر أو صفحة هبوط */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-gray-500">{t('domains.target')}</p>
              <div className="grid grid-cols-2 gap-2">
                {[['', t('domains.target_store')], ['page', t('domains.target_page')]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setTarget(k === 'page' ? (pages[0]?.id ?? '') : '')} disabled={k === 'page' && !pages.length}
                    className={`py-2.5 rounded-xl text-sm font-bold border disabled:opacity-40 ${(k === 'page') === !!target ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'border-gray-200 dark:border-zinc-800 text-gray-500'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {target && (
                <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-indigo-400">
                  {pages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
            <button disabled={adding || !value.trim()} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
              {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{t('domains.add')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
