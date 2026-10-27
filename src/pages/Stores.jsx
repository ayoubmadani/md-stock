// متاجري: اختيار المتجر الحالي (بدل قائمة الشريط العلوي)، وللمالك: إنشاء، تعديل، تفعيل/إيقاف، حذف بكتابة الاسم
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ExternalLink, Loader2, Pencil, Plus, Store, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Toggle, input } from '../components/product';

function DeleteSheet({ store, onClose, onDone }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = text.trim() === store.name.trim();
  const remove = async () => {
    setBusy(true);
    try { await api.delete(`/stores/${store.id}`); toast.success(t('stores.deleted')); onDone(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold text-rose-600">{t('stores.delete_title')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed">{t('stores.delete_warn')}</p>
        <p className="text-xs text-gray-500">{t('stores.delete_type')} <b className="text-gray-900 dark:text-white"><bdi>{store.name}</bdi></b></p>
        <input value={text} onChange={(e) => setText(e.target.value)} className={input} autoFocus />
        <button type="button" disabled={!ok || busy} onClick={remove} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-600 text-white font-bold disabled:opacity-40">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{t('stores.delete')}
        </button>
      </div>
    </div>
  );
}

export default function StoresPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { stores, storeId, selectStore, refresh } = useAuth();
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(null);
  const mine = stores.filter((s) => s.role === 'owner');
  const shared = stores.filter((s) => s.role !== 'owner');
  const pick = (s) => {
    if (s.id === storeId) return;
    selectStore(s.id);
    toast.success(t('stores.switched', { name: s.name }));
  };

  const toggle = async (s) => {
    setBusy(s.id);
    try { await api.put(`/stores/${s.id}/status`, { isActive: !s.isActive }); await refresh(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold">{t('nav.stores')} <span className="text-gray-400 text-sm" dir="ltr">{mine.length}</span></h1>
        <Link to="/stores/new" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold"><Plus className="w-4 h-4" />{t('stores.new')}</Link>
      </div>

      {mine.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400"><Store className="w-10 h-10" /><p className="text-sm">{t('stores.empty')}</p></div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800">
          {mine.map((s) => {
            // الأيقونة (favicon) مربعة — الشعار قد يكون عريضاً
            const icon = s.design?.faviconUrl;
            return (
              <div key={s.id} className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => pick(s)} className="flex-1 min-w-0 flex items-center gap-3 text-start">
                  <span className={`w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center ${s.id === storeId ? 'ring-2 ring-emerald-500' : ''}`}>
                    {icon ? <img src={icon} alt="" className="w-full h-full object-cover" /> : <Store className="w-5 h-5 text-gray-400" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`text-sm font-semibold truncate flex items-center gap-1.5 ${s.isActive === false ? 'text-gray-400' : ''}`}>
                      <bdi>{s.name}</bdi>{s.id === storeId && <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600"><Check className="w-3 h-3" />{t('stores.current')}</span>}
                    </span>
                    {s.subdomain && <span dir="ltr" className="block text-[11px] text-gray-400 truncate" style={{ textAlign: 'end' }}>{s.subdomain}.mdstore.top</span>}
                  </span>
                  </button>
                  {s.subdomain && <a href={`https://${s.subdomain}.mdstore.top`} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-indigo-500"><ExternalLink className="w-4 h-4" /></a>}
                  <span className={busy === s.id ? 'opacity-50 pointer-events-none' : ''}><Toggle checked={s.isActive !== false} onChange={() => toggle(s)} /></span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => nav(`/stores/${s.id}`)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold"><Pencil className="w-3.5 h-3.5" />{t('stores.edit')}</button>
                  <button type="button" onClick={() => setDel(s)} className="p-2 rounded-lg text-gray-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {shared.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 px-1 pt-2">{t('stores.shared')}</p>
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800">
            {shared.map((s) => (
              <button key={s.id} type="button" onClick={() => pick(s)} className="w-full flex items-center gap-3 p-3 text-start">
                <span className={`w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center ${s.id === storeId ? 'ring-2 ring-emerald-500' : ''}`}>
                  {s.design?.faviconUrl ? <img src={s.design.faviconUrl} alt="" className="w-full h-full object-cover" /> : <Store className="w-5 h-5 text-gray-400" />}
                </span>
                <span className="flex-1 min-w-0 text-sm font-semibold truncate"><bdi>{s.name}</bdi></span>
                {s.id === storeId && <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600"><Check className="w-3 h-3" />{t('stores.current')}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {del && <DeleteSheet store={del} onClose={() => setDel(null)} onDone={async () => { setDel(null); await refresh(); }} />}
    </div>
  );
}
