// الفريق: الأعضاء والمجموعات (للمالك) + الدعوات التي وصلتني للانضمام لمتاجر غيري (للجميع)
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Mail, Pause, Pencil, Play, Plus, Power, Search, Shield, Store, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PERMISSIONS, togglePerm } from '../lib/team';
import { input, label } from '../components/product';

const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80';

function Avatar({ name, src }) {
  return src ? <img src={src} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
    : <span className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 font-black flex items-center justify-center shrink-0">{(name || '?').charAt(0).toUpperCase()}</span>;
}

function GroupSheet({ group, onClose, onSave, saving }) {
  const { t } = useTranslation();
  const [name, setName] = useState(group?.name || '');
  const [perms, setPerms] = useState(group?.permissions || []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 max-h-[92dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between"><p className="font-bold">{group ? t('team.edit_group') : t('team.new_group')}</p><button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
        <div className="space-y-1.5"><label className={label}>{t('team.group_name')}</label><input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t('team.group_name_ph')} className={input} autoFocus={!group} /></div>
        <p className={label}>{t('team.permissions')}</p>
        <div className="space-y-1.5">
          {PERMISSIONS.map((p) => {
            const on = perms.includes(p);
            const locked = p === 'order.view' && perms.includes('order.manage');
            return (
              <button key={p} type="button" disabled={locked} onClick={() => setPerms((l) => togglePerm(l, p))} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-start ${on ? 'border-indigo-300 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-zinc-800'} ${locked ? 'opacity-70' : ''}`}>
                <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${on ? 'bg-indigo-600 text-white' : 'border border-gray-300 dark:border-zinc-600'}`}>{on && <Check className="w-3.5 h-3.5" />}</span>
                <span className="text-sm font-semibold">{t(`team.perm.${p}`)}</span>
              </button>
            );
          })}
        </div>
        <button type="button" disabled={!name.trim() || saving} onClick={() => onSave({ name: name.trim(), permissions: perms })} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('inventory.save')}
        </button>
      </div>
    </div>
  );
}

// دعوات وصلتني: قبول (يُضاف المتجر لقائمتي) أو رفض
function Invitations({ items, onAnswer, busy }) {
  const { t } = useTranslation();
  if (items === null) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!items.length) return <div className="flex flex-col items-center gap-3 py-12 text-gray-400"><Mail className="w-10 h-10" /><p className="text-sm">{t('team.inv_empty')}</p></div>;
  return items.map((inv) => (
    <div key={inv.id} className={`${box} p-4 space-y-3`}>
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0"><Store className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate"><bdi>{inv.storeName}</bdi></p>
          <p className="text-xs text-gray-500">{inv.groupName ? t('team.inv_by', { owner: inv.ownerName, group: inv.groupName }) : t('team.inv_by_nogroup', { owner: inv.ownerName })}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(inv.permissions || []).map((p) => <span key={p} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">{t(`team.perm.${p}`)}</span>)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy === inv.id} onClick={() => onAnswer(inv, true)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
          {busy === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{t('team.accept')}
        </button>
        <button type="button" disabled={busy === inv.id} onClick={() => onAnswer(inv, false)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold disabled:opacity-50"><X className="w-4 h-4" />{t('team.reject')}</button>
      </div>
    </div>
  ));
}

export default function TeamPage() {
  const { t, i18n } = useTranslation();
  const { storeId, store, refresh } = useAuth();
  const isOwner = store?.role === 'owner';
  const [tab, setTab] = useState(isOwner ? 'members' : 'invitations');
  const [invites, setInvites] = useState(null);
  const [members, setMembers] = useState(null);
  const [groups, setGroups] = useState([]);
  const [limits, setLimits] = useState(null);
  const [q, setQ] = useState('');
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => Promise.all([
    api.get(`/stores/${storeId}/members`).then((r) => setMembers(r.data ?? [])).catch(() => setMembers([])),
    api.get(`/stores/${storeId}/groups`).then((r) => setGroups(r.data ?? [])).catch(() => setGroups([])),
    api.get(`/stores/${storeId}/team/limits`).then((r) => setLimits(r.data)).catch(() => {}),
  ]), [storeId]);
  useEffect(() => { if (!isOwner) return; setMembers(null); load(); }, [load, isOwner]);
  const loadInvites = useCallback(() => api.get('/me/invitations').then((r) => setInvites(r.data ?? [])).catch(() => setInvites([])), []);
  useEffect(() => { loadInvites(); }, [loadInvites]);
  const answer = async (inv, accept) => {
    setBusy(inv.id);
    try {
      await api.post(`/invitations/${inv.id}/${accept ? 'accept' : 'reject'}`);
      if (accept) { toast.success(t('team.inv_accepted', { store: inv.storeName })); await refresh(); }
      await loadInvites();
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };

  const act = async (key, fn, ok) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); await load(); return true; } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); return false; } finally { setBusy(null); }
  };
  const lookup = async (e) => {
    e.preventDefault(); setFound(null);
    if (!q.trim()) return;
    setBusy('lookup');
    try { setFound((await api.get(`/stores/${storeId}/team/user-lookup`, { params: { q: q.trim() } })).data); } catch (err) { toast.error(errorMessage(err, t('team.not_found'))); } finally { setBusy(null); }
  };
  const date = (d) => (d ? new Date(d).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className={`grid ${isOwner ? 'grid-cols-3' : 'grid-cols-1'} gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900`}>
        {(isOwner ? ['members', 'groups', 'invitations'] : ['invitations']).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 ${tab === k ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-gray-500'}`}>
            {t(`team.tab_${k}`)}
            {k === 'invitations' && invites?.length > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">{invites.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'invitations' && <Invitations items={invites} onAnswer={answer} busy={busy} />}

      {tab === 'members' && isOwner && (
        <>
          {/* الدعوة */}
          <div className={`${box} p-4 space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-bold text-sm"><UserPlus className="w-4 h-4 text-indigo-600" />{t('team.invite')}</p>
              {limits && <span className="text-[11px] font-semibold text-gray-500" dir="ltr">{limits.used} / {limits.max}</span>}
            </div>
            {limits && limits.max === 0 ? <p className="text-sm font-semibold text-amber-600">{t('team.plan_none')}</p> : (
              <>
                <form onSubmit={lookup} className="flex gap-2">
                  <input dir="ltr" value={q} onChange={(e) => { setQ(e.target.value); setFound(null); }} placeholder={t('team.lookup_ph')} className={`${input} min-w-0`} />
                  <button type="submit" disabled={busy === 'lookup' || !q.trim()} className="px-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-50">{busy === 'lookup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}</button>
                </form>
                {found && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-500/10">
                    <Avatar name={found.name} src={found.avatar} />
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{found.name}</p><p className="text-[11px] text-gray-500" dir="ltr" style={{ textAlign: 'start' }}>{found.maskedEmail}</p></div>
                    <button type="button" disabled={busy === 'invite'} onClick={() => act('invite', () => api.post(`/stores/${storeId}/members/invite`, { userId: found.id }), t('team.invited')).then((ok) => ok && (setFound(null), setQ('')))} className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                      {busy === 'invite' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}{t('team.send')}
                    </button>
                  </div>
                )}
                <p className="text-[11px] text-gray-400">{t('team.invite_hint')}</p>
              </>
            )}
          </div>

          {members === null ? <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            : members.length === 0 ? <div className="flex flex-col items-center gap-3 py-12 text-gray-400"><Users className="w-10 h-10" /><p className="text-sm">{t('team.empty')}</p></div>
            : (
              <div className={`${box} divide-y divide-gray-100 dark:divide-zinc-800`}>
                {members.map((m) => (
                  <div key={m.id} className="p-3 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} src={m.avatar} />
                      <div className="flex-1 min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold"><span className="truncate"><bdi>{m.name}</bdi></span>
                          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${m.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'}`}>{t(`team.status_${m.status}`)}</span>
                          {m.suspendedByPlan && <span className="text-[10px] font-bold rounded-full px-2 py-0.5 bg-rose-50 text-rose-600 dark:bg-rose-500/10">{t('team.suspended')}</span>}
                        </p>
                        <p className="text-[11px] text-gray-400">{m.status === 'accepted' ? t('team.joined', { date: date(m.joinedAt) }) : t('team.invited_on', { date: date(m.createdAt) })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={m.groupId ?? ''} disabled={busy === m.id} onChange={(e) => act(m.id, () => api.patch(`/stores/${storeId}/members/${m.id}`, { groupId: e.target.value || null }))} className={`${input} py-2 text-sm ${m.groupId ? '' : 'border-amber-300'}`}>
                        <option value="">{t('team.no_group')}</option>
                        {groups.filter((g) => g.isActive || g.id === m.groupId).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      {m.status === 'accepted' && (
                        <button type="button" disabled={busy === m.id} title={m.suspendedByPlan ? t('team.reactivate') : t('team.suspend')} onClick={() => act(m.id, () => api.patch(`/stores/${storeId}/members/${m.id}/suspension`, { suspended: !m.suspendedByPlan }))} className="p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                          {m.suspendedByPlan ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                      )}
                      <button type="button" disabled={busy === m.id} title={t('team.remove')} onClick={() => window.confirm(t('team.confirm_remove')) && act(m.id, () => api.delete(`/stores/${storeId}/members/${m.id}`))} className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"><UserMinus className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </>
      )}

      {tab === 'groups' && isOwner && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-gray-400 flex-1">{t('team.owner_note')}</p>
            <button type="button" onClick={() => setEditing({})} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shrink-0"><Plus className="w-4 h-4" />{t('team.new_group')}</button>
          </div>
          {groups.length === 0 ? <div className="flex flex-col items-center gap-3 py-12 text-gray-400"><Shield className="w-10 h-10" /><p className="text-sm">{t('team.groups_empty')}</p></div>
            : groups.map((g) => (
              <div key={g.id} className={`${box} p-4 space-y-2.5 ${g.isActive ? '' : 'opacity-60'}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate"><bdi>{g.name}</bdi></p>
                    <p className="text-[11px] text-gray-400">{t('team.members_count', { count: (members ?? []).filter((m) => m.groupId === g.id).length })} · <span className={g.isActive ? 'text-emerald-600' : ''}>{g.isActive ? t('team.active') : t('team.disabled')}</span></p>
                  </div>
                  <button type="button" disabled={busy === g.id} onClick={() => act(g.id, () => api.patch(`/stores/${storeId}/groups/${g.id}/toggle`))} className="p-2 rounded-lg text-gray-400 hover:text-gray-700">{busy === g.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}</button>
                  <button type="button" onClick={() => setEditing(g)} className="p-2 rounded-lg text-gray-400 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                  <button type="button" onClick={() => window.confirm(t('team.confirm_delete_group')) && act(g.id, () => api.delete(`/stores/${storeId}/groups/${g.id}`))} className="p-2 rounded-lg text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.permissions.length === 0 && <span className="text-xs text-gray-400">—</span>}
                  {g.permissions.map((p) => <span key={p} className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">{t(`team.perm.${p}`)}</span>)}
                </div>
              </div>
            ))}
        </>
      )}

      {editing && (
        <GroupSheet group={editing.id ? editing : null} saving={busy === 'save'} onClose={() => setEditing(null)}
          onSave={(body) => act('save', () => (editing.id ? api.patch(`/stores/${storeId}/groups/${editing.id}`, body) : api.post(`/stores/${storeId}/groups`, body))).then((ok) => ok && setEditing(null))} />
      )}
    </div>
  );
}
