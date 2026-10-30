// أسعار التوصيل: حساب الأسعار (إنشاء/تسمية/حذف وتعيينه للمتجر)، البلديات المعطّلة لكل ولاية، لكل ولاية منزل/مكتب/إرجاع + تفعيل، سعر واحد للكل، واستيراد أسعار شركة التوصيل
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Check, Download, Home, Loader2, MapPin, Pencil, Plus, Search, Trash2, Truck, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { applyBulk, applyRates, communeChanges, communeSnapshot, communesOff, ratesApi, rowPayload } from '../lib/shipping-rates';
import { Toggle, input, label } from '../components/product';

const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80';
const priceInput = 'w-full min-w-0 px-2 py-2 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-sm font-bold text-center outline-none focus:border-indigo-400';

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 max-h-[88dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between"><p className="font-bold">{title}</p><button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
        {children}
      </div>
    </div>
  );
}

// بلديات الولاية: تعطيل بلدية كلياً أو المنزل/المكتب فقط — لا يظهر للزبون ما عُطّل
function CommunesSheet({ wilaya, route, onClose, onSaved }) {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const [initial, setInitial] = useState({});
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get(...route).then(({ data }) => { const rows = Array.isArray(data) ? data : []; setList(rows); setInitial(communeSnapshot(rows)); })
      .catch((e) => { toast.error(errorMessage(e, t('inventory.error'))); setList([]); });
  }, [route[0], t]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (id, patch) => setList((l) => l.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const setAll = (on) => setList((l) => l.map((c) => ({ ...c, homeEnabled: on, officeEnabled: on })));
  const changes = list ? communeChanges(list, initial) : [];
  const shown = (list ?? []).filter((c) => !q.trim() || `${c.name} ${c.ar_name ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const save = async () => {
    if (!changes.length) return onClose();
    setSaving(true);
    try {
      const { data } = await api.post(route[0], { communes: changes }, route[1]);
      toast.success(t('rates.communes_saved'));
      onSaved(wilaya.id, data?.restricted ?? 0);
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); setSaving(false); }
  };
  return (
    <Sheet title={t('rates.communes_title', { wilaya: wilaya.ar_name || wilaya.name })} onClose={onClose}>
      <p className="text-xs text-gray-500">{t('rates.communes_hint')}</p>
      {list === null ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div> : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('rates.communes_search')} className={`${input} ps-9`} /></div>
            <button type="button" onClick={() => setAll(true)} className="px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">{t('rates.enable_all')}</button>
            <button type="button" onClick={() => setAll(false)} className="px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-500 dark:bg-rose-500/10">{t('rates.disable_all')}</button>
          </div>
          <p className="text-[11px] text-gray-400">{t('rates.communes_off', { count: communesOff(list), total: list.length })}</p>
          <div className="rounded-xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
            {shown.map((c) => {
              const off = !c.homeEnabled && !c.officeEnabled;
              return (
                <div key={c.id} className={`flex items-center gap-2 p-2.5 ${off ? 'opacity-50' : ''}`}>
                  <span className={`flex-1 min-w-0 text-sm font-semibold truncate ${off ? 'line-through' : ''}`}><bdi>{c.ar_name || c.name}</bdi></span>
                  {[['homeEnabled', Home, 'home'], ['officeEnabled', Building2, 'office']].map(([f, Icon, k]) => (
                    <button key={f} type="button" onClick={() => set(c.id, { [f]: !c[f] })} title={t(`rates.${k}`)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold ${c[f] ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 line-through'}`}>
                      <Icon className="w-3.5 h-3.5" />{t(`rates.${k}`)}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          <button type="button" disabled={saving} onClick={save} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{changes.length ? t('rates.communes_save', { count: changes.length }) : t('rates.close')}
          </button>
        </>
      )}
    </Sheet>
  );
}

export default function DeliveryRatesPage() {
  const { t } = useTranslation();
  // عضو الفريق (صلاحية «أسعار التوصيل»): أسعار هذا المتجر فقط — بلا حسابات أسعار ولا استيراد
  const { storeId, isOwner } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState(null);
  const [rows, setRows] = useState(null);
  const [dirty, setDirty] = useState(new Set());
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(null);
  const [sheet, setSheet] = useState(null); // 'bulk' | 'import' | 'profile'
  const [form, setForm] = useState({ mode: 'create', name: '' }); // إنشاء/تسمية حساب أسعار
  const [communesOf, setCommunesOf] = useState(null); // الولاية المفتوحة بلدياتها
  const [bulk, setBulk] = useState({ home: '', office: '', ret: '' });
  const [accounts, setAccounts] = useState(null);
  const R = useMemo(() => ratesApi(isOwner, storeId, profileId), [isOwner, storeId, profileId]);
  const cfg = R.list[1];

  const loadProfiles = useCallback((select) => api.get('/shipping/profiles').then(({ data }) => {
    setProfiles(data ?? []);
    setProfileId((prev) => {
      const want = select ?? prev;
      if (want && data.some((p) => p.id === want)) return want;
      return (data.find((p) => p.stores?.some((s) => s.id === storeId)) || data[0])?.id ?? null;
    });
  }).catch(() => setProfiles([])), [storeId]);
  useEffect(() => { if (isOwner) loadProfiles(); }, [isOwner, loadProfiles]);
  const loadRows = useCallback(() => { setRows(null); setDirty(new Set()); api.get(...R.list).then((r) => setRows(r.data ?? [])).catch(() => setRows([])); }, [R]);
  useEffect(() => { if (profileId || !isOwner) loadRows(); }, [profileId, isOwner, loadRows]);

  const profile = profiles.find((p) => p.id === profileId);
  const usedHere = !!profile?.stores?.some((s) => s.id === storeId);
  const shown = (rows ?? []).filter((w) => !q.trim() || `${w.name} ${w.ar_name ?? ''} ${w.code ?? w.id}`.toLowerCase().includes(q.trim().toLowerCase()));

  const edit = (id, patch) => { setRows((l) => l.map((w) => (w.id === id ? { ...w, ...patch } : w))); setDirty((d) => new Set(d).add(id)); };
  const saveDirty = async () => {
    setBusy('save');
    try {
      await api.post(R.update[0], rows.filter((w) => dirty.has(w.id)).map(rowPayload), R.update[1]);
      toast.success(t('rates.saved', { count: dirty.size })); setDirty(new Set());
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  // تفعيل الولاية / المنزل / المكتب: يُحفظ مباشرة
  const toggle = async (w, field) => {
    const next = !(w[field] !== false);
    if (field !== 'isActive' && !next) {
      const other = field === 'homeEnabled' ? 'officeEnabled' : 'homeEnabled';
      if (w[other] === false) return toast.error(t('rates.need_one'));
    }
    setBusy(`t-${w.id}`);
    try { await api.post(R.update[0], [{ wilayaId: w.id, [field]: next }], R.update[1]); setRows((l) => l.map((x) => (x.id === w.id ? { ...x, [field]: next } : x))); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const init = async () => {
    setBusy('init');
    try { await api.get('/shipping/create-shipping', cfg).catch(() => {}); loadRows(); loadProfiles(); } finally { setBusy(null); }
  };
  const useForStore = async () => {
    setBusy('assign');
    try { await api.post('/shipping/store-profile', { storeId, profileId }); await loadProfiles(profileId); toast.success(t('rates.assigned', { name: profile?.name })); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const saveProfile = async () => {
    const name = form.name.trim();
    if (!name) return;
    setBusy('profile');
    try {
      if (form.mode === 'create') {
        // نسخة من أسعار الحساب الحالي — تُعدّل بعدها
        const { data } = await api.post('/shipping/profiles', { name, copyFromId: profileId || undefined, country: profile?.country || 'DZ' });
        await loadProfiles(data?.id);
        toast.success(t('rates.profile_created'));
      } else {
        await api.patch(`/shipping/profiles/${profileId}`, { name });
        await loadProfiles(profileId);
        toast.success(t('inventory.saved'));
      }
      setSheet(null);
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const removeProfile = async () => {
    if (!profile || profile.isDefault || !window.confirm(t('rates.profile_delete_confirm', { name: profile.name }))) return;
    setBusy('profile');
    try { await api.delete(`/shipping/profiles/${profileId}`); await loadProfiles(null); toast.success(t('rates.profile_deleted')); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const applyBulkNow = () => {
    const ids = shown.map((w) => w.id);
    setRows((l) => applyBulk(l, ids, bulk));
    setDirty((d) => new Set([...d, ...ids]));
    setSheet(null); setBulk({ home: '', office: '', ret: '' });
    toast.message(t('rates.bulk_applied', { count: ids.length }));
  };
  const openImport = () => { setSheet('import'); setAccounts(null); api.get(`/stores/${storeId}/shipping/accounts`).then((r) => setAccounts(r.data ?? [])).catch(() => setAccounts([])); };
  const importFrom = async (acc) => {
    setBusy(`acc-${acc.id}`);
    try {
      if (!acc.isDefault) await api.patch(`/stores/${storeId}/shipping/accounts/${acc.id}/default`);
      const { data } = await api.get(`/stores/${storeId}/shipping/rates`);
      const { list, matched } = applyRates(rows, Array.isArray(data) ? data : []);
      setRows(list);
      setDirty((d) => new Set([...d, ...list.filter((w, i) => w !== rows[i]).map((w) => w.id)]));
      setSheet(null);
      if (matched) toast.success(t('rates.imported', { count: matched, account: acc.accountName })); else toast.error(t('rates.import_none'));
    } catch (e) { toast.error(errorMessage(e, t('rates.import_error'))); } finally { setBusy(null); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-3 pb-4">
      {/* حساب الأسعار */}
      {profiles.length > 0 && (
        <div className={`${box} p-3 space-y-2`}>
          <label className={label}>{t('rates.profile')}</label>
          <div className="flex gap-2">
            <select value={profileId ?? ''} onChange={(e) => setProfileId(e.target.value)} className={`${input} flex-1 min-w-0`}>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}{p.stores?.some((s) => s.id === storeId) ? ` ✓ ${t('rates.this_store')}` : ''}</option>)}
            </select>
            <button type="button" onClick={() => { setForm({ mode: 'rename', name: profile?.name || '' }); setSheet('profile'); }} title={t('rates.profile_rename')} className="px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-500"><Pencil className="w-4 h-4" /></button>
            {profile && !profile.isDefault && <button type="button" disabled={busy === 'profile'} onClick={removeProfile} title={t('rates.profile_delete')} className="px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-rose-500 disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>}
          </div>
          <button type="button" onClick={() => { setForm({ mode: 'create', name: '' }); setSheet('profile'); }} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400"><Plus className="w-4 h-4" />{t('rates.profile_new')}</button>
          {!usedHere && profile && (
            <button type="button" disabled={busy === 'assign'} onClick={useForStore} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 text-sm font-bold disabled:opacity-50">
              {busy === 'assign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{t('rates.use_here')}
            </button>
          )}
        </div>
      )}

      {rows === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-gray-400 text-center"><Truck className="w-10 h-10" /><p className="text-sm max-w-xs">{t('rates.empty')}</p>
            {isOwner && <button type="button" disabled={busy === 'init'} onClick={init} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">{busy === 'init' && <Loader2 className="w-4 h-4 animate-spin" />}{t('rates.init')}</button>}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('rates.search')} className={`${input} ps-9`} />
              </div>
              <button type="button" onClick={() => setSheet('bulk')} title={t('rates.bulk')} className="px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300"><Wand2 className="w-5 h-5" /></button>
              {isOwner && <button type="button" onClick={openImport} title={t('rates.import')} className="px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300"><Download className="w-5 h-5" /></button>}
            </div>

            <div className={`${box} divide-y divide-gray-100 dark:divide-zinc-800`}>
              {shown.map((w) => (
                <div key={w.id} className={`p-3 space-y-2 ${w.isActive ? '' : 'opacity-50'} ${dirty.has(w.id) ? 'bg-amber-50/50 dark:bg-amber-500/5' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs font-black flex items-center justify-center shrink-0" dir="ltr">{w.code ?? w.id}</span>
                    <span className="flex-1 min-w-0 text-sm font-bold truncate"><bdi>{w.ar_name || w.name}</bdi></span>
                    {w.isActive && (
                      <button type="button" onClick={() => setCommunesOf(w)} title={t('rates.communes')} className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold ${w.restrictedCommunes ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}>
                        <MapPin className="w-3.5 h-3.5" />{w.restrictedCommunes ? t('rates.communes_restricted', { count: w.restrictedCommunes }) : t('rates.communes')}
                      </button>
                    )}
                    <span className={busy === `t-${w.id}` ? 'opacity-50 pointer-events-none' : ''}><Toggle checked={!!w.isActive} onChange={() => toggle(w, 'isActive')} /></span>
                  </div>
                  {w.isActive && (
                    <div className="grid grid-cols-3 gap-2">
                      {[['homeEnabled', 'livraisonHome', Home, 'home'], ['officeEnabled', 'livraisonOfice', Building2, 'office']].map(([en, field, Icon, k]) => (
                        <div key={k} className="space-y-1">
                          <button type="button" onClick={() => toggle(w, en)} className={`w-full flex items-center justify-center gap-1 text-[10px] font-bold ${w[en] !== false ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 line-through'}`}><Icon className="w-3 h-3" />{t(`rates.${k}`)}</button>
                          <input type="number" inputMode="numeric" dir="ltr" min="0" disabled={w[en] === false} value={w[field] ?? ''} onChange={(e) => edit(w.id, { [field]: e.target.value === '' ? '' : Number(e.target.value) })} className={`${priceInput} disabled:opacity-30`} />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-center text-rose-500">{t('rates.return')}</p>
                        <input type="number" inputMode="numeric" dir="ltr" min="0" value={w.livraisonReturn ?? ''} onChange={(e) => edit(w.id, { livraisonReturn: e.target.value === '' ? '' : Number(e.target.value) })} className={priceInput} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

      {dirty.size > 0 && (
        <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 z-20">
          <button type="button" disabled={busy === 'save'} onClick={saveDirty} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg disabled:opacity-60">
            {busy === 'save' && <Loader2 className="w-4 h-4 animate-spin" />}{t('rates.save', { count: dirty.size })}
          </button>
        </div>
      )}

      {sheet === 'bulk' && (
        <Sheet title={t('rates.bulk')} onClose={() => setSheet(null)}>
          <p className="text-xs text-gray-500">{q.trim() ? t('rates.bulk_filtered', { count: shown.length }) : t('rates.bulk_all', { count: shown.length })}</p>
          <div className="grid grid-cols-3 gap-2">
            {[['home', 'home'], ['office', 'office'], ['ret', 'return']].map(([k, l]) => (
              <div key={k} className="space-y-1"><p className="text-[11px] font-bold text-center text-gray-500">{t(`rates.${l}`)}</p>
                <input type="number" inputMode="numeric" dir="ltr" min="0" value={bulk[k]} onChange={(e) => setBulk((b) => ({ ...b, [k]: e.target.value }))} placeholder="—" className={priceInput} /></div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">{t('rates.bulk_hint')}</p>
          <button type="button" disabled={!bulk.home && !bulk.office && !bulk.ret} onClick={applyBulkNow} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">{t('rates.apply')}</button>
        </Sheet>
      )}
      {sheet === 'profile' && (
        <Sheet title={form.mode === 'create' ? t('rates.profile_new') : t('rates.profile_rename')} onClose={() => setSheet(null)}>
          <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && saveProfile()} maxLength={80} placeholder={t('rates.profile_name')} className={input} />
          {form.mode === 'create' && profile && <p className="text-[11px] text-gray-400">{t('rates.profile_copy_hint', { name: profile.name })}</p>}
          <button type="button" disabled={!form.name.trim() || busy === 'profile'} onClick={saveProfile} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
            {busy === 'profile' && <Loader2 className="w-4 h-4 animate-spin" />}{form.mode === 'create' ? t('rates.profile_create') : t('inventory.save')}
          </button>
        </Sheet>
      )}
      {communesOf && (
        <CommunesSheet wilaya={communesOf} route={R.communes(communesOf.id)} onClose={() => setCommunesOf(null)}
          onSaved={(id, restricted) => { setRows((l) => l.map((w) => (w.id === id ? { ...w, restrictedCommunes: restricted } : w))); setCommunesOf(null); }} />
      )}
      {sheet === 'import' && (
        <Sheet title={t('rates.import')} onClose={() => setSheet(null)}>
          <p className="text-xs text-gray-500">{t('rates.import_hint')}</p>
          {accounts === null ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            : accounts.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">{t('confirm.no_account')}</p>
            : accounts.map((a) => (
              <button key={a.id} type="button" disabled={!!busy} onClick={() => importFrom(a)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800 text-start disabled:opacity-50">
                <Truck className="w-5 h-5 text-indigo-500 shrink-0" /><span className="flex-1 text-sm font-semibold truncate"><bdi>{a.accountName || a.providerName}</bdi></span>
                {busy === `acc-${a.id}` && <Loader2 className="w-4 h-4 animate-spin" />}
              </button>
            ))}
        </Sheet>
      )}
    </div>
  );
}
