// دومين المنتج وبكسلات المنتج (من صفحة تعديل المنتج): دومين يعرض صفحة هذا المنتج وحدها، وبكسلات تعمل في صفحته فقط
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Globe, Loader2, Plus, Trash2, Unlink, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { productDomains } from '../lib/domains';
import { productPixels } from '../lib/pixel-form';
import { PixelSheet, typeOf } from '../pages/Pixels';
import { Toggle } from './product';

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[85dvh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800">
          <p className="font-bold">{title}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">{children}</div>
      </div>
    </div>
  );
}

const Spin = () => <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

export function ProductDomainSheet({ storeId, productId, onClose }) {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/domain/store/${storeId}`).then((r) => setList(r.data || [])).catch(() => setList([]));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  const link = async (d) => {
    setBusy(true);
    try {
      await api.patch(`/domain/${d.id}/assign-product`, { productId, storeId });
      toast.success(t('product_links.linked'));
      load();
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(false); }
  };
  const unlink = async (d) => {
    if (!window.confirm(t('product_links.confirm_unlink', { domain: d.domain }))) return;
    setBusy(true);
    try {
      await api.patch(`/domain/${d.id}/unassign-page`, { storeId });
      toast.success(t('domains.unlinked'));
      load();
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(false); }
  };

  const { linked, free } = list ? productDomains(list, productId) : { linked: null, free: [] };
  return (
    <Sheet title={t('product_links.domain')} onClose={onClose}>
      {!list ? <Spin /> : linked ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-3 space-y-2">
          <p className="text-xs text-gray-500">{t('product_links.domain_linked')}</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${linked.isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <span className="flex-1 font-bold text-sm truncate"><bdi dir="ltr">{linked.domain}</bdi></span>
            <a href={`https://${linked.domain}`} target="_blank" rel="noreferrer" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 text-gray-500"><ExternalLink className="w-4 h-4" /></a>
            <button type="button" disabled={busy} onClick={() => unlink(linked)} title={t('domains.unlink')} className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-600 disabled:opacity-50"><Unlink className="w-4 h-4" /></button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">{t('product_links.domain_pick')}</p>
          {free.length === 0 && <p className="text-center text-sm text-gray-400 py-6">{t('product_links.no_free_domain')}</p>}
          {free.map((d) => (
            <button key={d.id} type="button" disabled={busy} onClick={() => link(d)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 text-start text-sm font-semibold disabled:opacity-50">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${d.isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="flex-1 truncate"><bdi dir="ltr">{d.domain}</bdi></span>
              <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
            </button>
          ))}
          <Link to="/domains" className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            <Plus className="w-4 h-4" />{t('domains.add_new')}
          </Link>
        </>
      )}
    </Sheet>
  );
}

export function ProductPixelsSheet({ storeId, productId, onClose }) {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    api.get(`/stores/${storeId}/pixels`).then((r) => setList(productPixels(r.data?.data || r.data || [], productId))).catch(() => setList([]));
  }, [storeId, productId]);
  useEffect(() => { load(); }, [load]);

  const toggle = async (p) => {
    setBusy(p.id);
    try { await api.patch(`/stores/pixels/${p.id}/toggle`); load(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const remove = async (p) => {
    if (!window.confirm(t('pixels.confirm_delete', { id: p.pixelId }))) return;
    try { await api.delete(`/stores/pixels/${p.id}`); toast.success(t('pixels.deleted')); load(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };

  if (edit) return <PixelSheet storeId={storeId} productId={productId} pixel={edit.pixel} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />;
  return (
    <Sheet title={t('product_links.pixels')} onClose={onClose}>
      <p className="text-xs text-gray-500">{t('product_links.pixels_hint')}</p>
      {!list ? <Spin /> : list.map((p) => {
        const ty = typeOf(p.type);
        return (
          <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60">
            <button type="button" onClick={() => setEdit({ pixel: p })} className="flex-1 min-w-0 flex items-center gap-3 text-start">
              <span className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${ty.color} ${p.isActive ? '' : 'opacity-40'}`}><ty.icon className="w-4 h-4" /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate"><bdi>{p.name || t(`pixels.type_${p.type}`)}</bdi></span>
                <span className="text-[11px] text-gray-400" dir="ltr">{p.pixelId}</span>
              </span>
            </button>
            <span className={busy === p.id ? 'opacity-50 pointer-events-none' : ''}><Toggle checked={p.isActive} onChange={() => toggle(p)} /></span>
            <button type="button" onClick={() => remove(p)} className="p-2 rounded-lg text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </div>
        );
      })}
      {list && (
        <button type="button" onClick={() => setEdit({ pixel: null })} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
          <Plus className="w-4 h-4" />{t('pixels.new')}
        </button>
      )}
    </Sheet>
  );
}
