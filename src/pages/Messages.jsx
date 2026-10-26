// رسائل الزوار (نموذج «اتصل بنا» في المتاجر): جديدة / مقروءة / أرشيف — بحث، اتصال وواتساب، أرشفة وحذف
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, ArchiveRestore, Inbox, Loader2, Mail, MessageCircle, Phone, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { timeAgo } from '../components/orders';
import { input } from '../components/product';

const TABS = ['inbox', 'viewed', 'archive'];
// 0555… ← 213555… لرابط واتساب
const waNumber = (p) => String(p || '').replace(/\D/g, '').replace(/^0/, '213');

export default function MessagesPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState('inbox');
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    const params = { archive: tab === 'archive', filter: q.trim() || undefined, nb: '1' };
    if (tab === 'inbox') params.viewed = 'false';
    if (tab === 'viewed') params.viewed = 'true';
    api.get('/user/message-user', { params }).then(({ data }) => setList(Array.isArray(data) ? data : data?.data ?? [])).catch(() => setList([]));
  }, [tab, q]);
  useEffect(() => { setList(null); const id = setTimeout(load, q ? 400 : 0); return () => clearTimeout(id); }, [load, q]);

  const view = (m) => {
    setOpen(open === m.id ? null : m.id);
    if (!m.isViewed) {
      api.patch(`/user/message-user/${m.id}/view`).catch(() => {});
      setList((l) => l.map((x) => (x.id === m.id ? { ...x, isViewed: true } : x)));
    }
  };
  const archive = async (m) => {
    try { await api.patch(`/user/message-user/${m.id}/archive?state=${tab !== 'archive'}`); setList((l) => l.filter((x) => x.id !== m.id)); toast.success(tab === 'archive' ? t('messages.restored') : t('messages.archived')); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };
  const remove = async (m) => {
    if (!window.confirm(t('messages.confirm_delete'))) return;
    try { await api.delete(`/user/message-user/${m.id}`); setList((l) => l.filter((x) => x.id !== m.id)); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900">
        {TABS.map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`py-2 rounded-lg text-sm font-bold ${tab === k ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-gray-500'}`}>{t(`messages.tab_${k}`)}</button>
        ))}
      </div>
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute top-1/2 -translate-y-1/2 start-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('messages.search')} className={`${input} ps-9`} />
      </div>

      {list === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-400"><Inbox className="w-10 h-10" /><p className="text-sm">{t('messages.empty')}</p></div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800">
            {list.map((m) => (
              <div key={m.id} className="p-3">
                <button type="button" onClick={() => view(m)} className="w-full flex items-start gap-3 text-start">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${m.isViewed ? 'bg-transparent' : 'bg-indigo-500'}`} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${m.isViewed ? 'font-semibold' : 'font-black'}`}><bdi>{m.name || m.phone || m.email}</bdi></span>
                      <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(m.createdAt, i18n.language)}</span>
                    </span>
                    {m.store?.name && <span className="block text-[11px] text-indigo-500 truncate"><bdi>{m.store.name}</bdi></span>}
                    <span className={`block text-xs text-gray-500 dark:text-zinc-400 mt-0.5 ${open === m.id ? 'whitespace-pre-wrap' : 'truncate'}`}><bdi>{m.message}</bdi></span>
                  </span>
                </button>
                {open === m.id && (
                  <div className="flex flex-wrap items-center gap-2 mt-3 ps-5">
                    {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-xs font-bold" dir="ltr"><Phone className="w-3.5 h-3.5" />{m.phone}</a>}
                    {m.phone && <a href={`https://wa.me/${waNumber(m.phone)}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"><MessageCircle className="w-4 h-4" /></a>}
                    {m.email && <a href={`mailto:${m.email}`} className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300"><Mail className="w-4 h-4" /></a>}
                    <span className="flex-1" />
                    <button type="button" onClick={() => archive(m)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800">{tab === 'archive' ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}</button>
                    <button type="button" onClick={() => remove(m)} className="p-2 rounded-lg text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
