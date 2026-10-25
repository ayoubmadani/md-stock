// البكسلات: نفس بكسلات اللوحة (فيسبوك/تيك توك/جوجل) — إضافة، تعديل، تفعيل/إيقاف، حذف، ورمز Conversions API لفيسبوك
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Code2, Facebook, Loader2, Megaphone, Music2, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EMPTY_PIXEL, pixelError, pixelPayload } from '../lib/pixel-form';
import { Toggle, input, label } from '../components/product';

const TYPES = [
  { id: 'facebook', icon: Facebook, color: 'bg-[#1877F2] text-white' },
  { id: 'tiktok', icon: Music2, color: 'bg-black text-white dark:bg-white dark:text-black' },
  { id: 'google', icon: Search, color: 'bg-amber-500 text-white' },
];
const typeOf = (id) => TYPES.find((x) => x.id === id) ?? TYPES[0];

function PixelSheet({ storeId, pixel, onClose, onSaved }) {
  const { t } = useTranslation();
  const [f, setF] = useState(() => (pixel ? { ...EMPTY_PIXEL, name: pixel.name || '', type: pixel.type, pixelId: pixel.pixelId, testEventCode: pixel.testEventCode || '', isActive: pixel.isActive } : EMPTY_PIXEL));
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v?.target ? v.target.value : v }));

  const save = async (e) => {
    e.preventDefault();
    const err = pixelError(f);
    if (err) return toast.error(t(err));
    setSaving(true);
    try {
      const body = pixelPayload(f, !!pixel);
      if (pixel) await api.patch(`/stores/pixels/${pixel.id}`, body);
      else await api.post(`/stores/${storeId}/pixels`, body);
      toast.success(t('inventory.saved'));
      onSaved();
    } catch (err2) {
      toast.error(errorMessage(err2, t('inventory.error')));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={save} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 max-h-[92dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{pixel ? t('pixels.edit') : t('pixels.new')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        {!pixel && (
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((x) => (
              <button key={x.id} type="button" onClick={() => set('type')(x.id)} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-bold ${f.type === x.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-gray-100 dark:border-zinc-800 text-gray-500'}`}>
                <x.icon className="w-5 h-5" />{t(`pixels.type_${x.id}`)}
              </button>
            ))}
          </div>
        )}
        <div className="space-y-1.5"><label className={label}>{t('pixels.pixel_id')}</label><input dir="ltr" inputMode={f.type === 'facebook' ? 'numeric' : 'text'} value={f.pixelId} onChange={set('pixelId')} className={input} autoFocus={!pixel} /></div>
        <div className="space-y-1.5"><label className={label}>{t('pixels.name')}</label><input value={f.name} onChange={set('name')} className={input} /></div>
        {f.type === 'facebook' && (
          <div className="rounded-xl bg-gray-50 dark:bg-zinc-800/60 p-3 space-y-2.5">
            <p className="text-xs font-bold">Conversions API <span className="font-normal text-gray-400">— {t('pixels.optional')}</span></p>
            <div className="space-y-1.5">
              <label className={label}>Access Token</label>
              <input dir="ltr" type="password" autoComplete="off" value={f.accessToken} onChange={set('accessToken')} placeholder={pixel?.hasAccessToken ? '••••••••' : 'EAA…'} className={input} />
              {pixel?.hasAccessToken && !f.accessToken && <Toggle checked={f.clearToken} onChange={set('clearToken')}>{t('pixels.clear_token')}</Toggle>}
            </div>
            <div className="space-y-1.5"><label className={label}>Test Event Code</label><input dir="ltr" value={f.testEventCode} onChange={set('testEventCode')} placeholder="TEST12345" className={input} /></div>
          </div>
        )}
        <Toggle checked={f.isActive} onChange={set('isActive')}>{t('pixels.active')}</Toggle>
        <button disabled={saving} className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-60">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('inventory.save')}
        </button>
      </form>
    </div>
  );
}

export default function PixelsPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [list, setList] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    api.get(`/stores/${storeId}/pixels`).then((r) => setList(r.data?.data || r.data || [])).catch(() => setList([]));
  }, [storeId]);
  useEffect(() => { setList(null); load(); }, [load]);

  const toggle = async (p) => {
    setBusy(p.id);
    try { await api.patch(`/stores/pixels/${p.id}/toggle`); load(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const remove = async (p) => {
    if (!window.confirm(t('pixels.confirm_delete', { id: p.pixelId }))) return;
    try { await api.delete(`/stores/pixels/${p.id}`); toast.success(t('pixels.deleted')); load(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };

  if (!list) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold">{t('nav.pixels')} <span className="text-gray-400 text-sm" dir="ltr">{list.length}</span></h1>
        <button type="button" onClick={() => setSheet({ pixel: null })} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
          <Plus className="w-4 h-4" />{t('pixels.new')}
        </button>
      </div>

      <Link to="/meta" className="flex items-center gap-3 rounded-2xl bg-[#1877F2]/10 p-3 text-sm">
        <Megaphone className="w-5 h-5 text-[#1877F2] shrink-0" />
        <span className="flex-1 text-[#1877F2] dark:text-blue-300 font-semibold">{t('pixels.from_meta')}</span>
      </Link>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Code2 className="w-10 h-10" />
          <p className="text-sm">{t('pixels.empty')}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800">
          {list.map((p) => {
            const ty = typeOf(p.type);
            return (
              <div key={p.id} className="flex items-center gap-3 p-3">
                <button type="button" onClick={() => setSheet({ pixel: p })} className="flex-1 min-w-0 flex items-center gap-3 text-start">
                  <span className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${ty.color} ${p.isActive ? '' : 'opacity-40'}`}><ty.icon className="w-5 h-5" /></span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-sm font-semibold truncate ${p.isActive ? '' : 'text-gray-400'}`}><bdi>{p.name || t(`pixels.type_${p.type}`)}</bdi></span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-400">
                      <span dir="ltr">{p.pixelId}</span>
                      {p.hasAccessToken && <span className="px-1.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-bold">CAPI</span>}
                      {p.scope === 'landing_page' && <span className="px-1.5 rounded bg-gray-100 dark:bg-zinc-800">{t('pixels.landing')}</span>}
                    </span>
                  </span>
                </button>
                <span className={busy === p.id ? 'opacity-50 pointer-events-none' : ''}><Toggle checked={p.isActive} onChange={() => toggle(p)} /></span>
                <button type="button" onClick={() => remove(p)} className="p-2 rounded-lg text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            );
          })}
        </div>
      )}

      {sheet && <PixelSheet storeId={storeId} pixel={sheet.pixel} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); load(); }} />}
    </div>
  );
}
