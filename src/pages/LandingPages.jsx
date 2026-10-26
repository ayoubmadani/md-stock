// صفحات الهبوط: القائمة (غلاف، منتج، أرقام، دومين) + إنشاء من منتج بالذكاء الاصطناعي ونشر،
// تفعيل/إيقاف، نسخ، حذف، تغيير المنتج، ربط دومين، المنصة — تصميم الصفحة نفسه في محرر اللوحة
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, ExternalLink, Globe, LayoutTemplate, Loader2, Monitor, MoreVertical, Package, Plus, Power, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { editorUrl, pageCr, pageUrl } from '../lib/landing-pages';
import NewLandingSheet from '../components/NewLandingSheet';
import { input, label } from '../components/product';

const sheet = 'bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 max-h-[92dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]';
function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={sheet}>
        <div className="flex items-center justify-between gap-2"><p className="font-bold truncate">{title}</p><button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
        {children}
      </div>
    </div>
  );
}

// إجراءات صفحة واحدة
function PageSheet({ page, storeId, products, onClose, onChanged }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(null);
  const [domains, setDomains] = useState(null);
  const [platform, setPlatform] = useState(page.platform || '');
  useEffect(() => { api.get(`/domain/store/${storeId}`).then((r) => setDomains(r.data ?? [])).catch(() => setDomains([])); }, [storeId]);

  const run = async (key, fn, ok, close) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); onChanged(); if (close) onClose(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const linked = (domains ?? []).find((d) => d.scope === 'landing_page' && d.builderPageId === page.id);
  const free = (domains ?? []).filter((d) => d.scope === 'store');
  const url = pageUrl(page);
  const action = 'w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 text-sm font-semibold disabled:opacity-50';

  return (
    <Sheet title={page.name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        {url && <a href={url} target="_blank" rel="noreferrer" className={action}><ExternalLink className="w-4 h-4 text-indigo-500" />{t('lp.preview')}</a>}
        <a href={editorUrl(page.id)} target="_blank" rel="noreferrer" className={action}><Monitor className="w-4 h-4 text-indigo-500" />{t('lp.edit_design')}</a>
        <button type="button" disabled={!!busy} onClick={() => run('pub', () => api.post(`/builder-pages/${page.id}/publish`), t('lp.published_ok'))} className={action}>{busy === 'pub' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-500" />}{page.publishedUrl ? t('lp.republish') : t('lp.publish')}</button>
        <button type="button" disabled={!!busy} onClick={() => run('toggle', () => api.post(`/builder-pages/${page.id}/toggle-status`))} className={action}>{busy === 'toggle' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className={`w-4 h-4 ${page.isActive ? 'text-emerald-500' : 'text-gray-400'}`} />}{page.isActive ? t('lp.disable') : t('lp.enable')}</button>
        <button type="button" disabled={!!busy} onClick={() => run('dup', () => api.post(`/builder-pages/${page.id}/duplicate`), t('lp.duplicated'), true)} className={action}>{busy === 'dup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4 text-gray-500" />}{t('lp.duplicate')}</button>
        <button type="button" disabled={!!busy} onClick={() => window.confirm(t('lp.confirm_delete', { name: page.name })) && run('del', () => api.delete(`/builder-pages/${page.id}`), t('lp.deleted'), true)} className={`${action} text-rose-600`}><Trash2 className="w-4 h-4" />{t('lp.delete')}</button>
      </div>

      <div className="space-y-1.5"><label className={label}>{t('lp.product')}</label>
        <select value={page.productId ?? ''} disabled={!!busy} onChange={(e) => run('prod', () => api.patch(`/builder-pages/${page.id}/product`, { productId: e.target.value || null }), t('inventory.saved'))} className={input}>
          <option value="">{t('lp.no_product')}</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="space-y-1.5"><label className={label}>{t('lp.domain')}</label>
        {domains === null ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : linked ? (
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 dark:border-zinc-800">
            <Globe className="w-4 h-4 text-gray-400 shrink-0" /><span className="flex-1 truncate text-sm font-mono" dir="ltr" style={{ textAlign: 'start' }}>{linked.domain}</span>
            <button type="button" disabled={!!busy} onClick={() => run('unlink', () => api.patch(`/domain/${linked.id}/unassign-page`, { storeId }), t('lp.unlinked'))} className="text-xs font-bold text-rose-500">{t('lp.unlink')}</button>
          </div>
        ) : free.length ? (
          <select value="" disabled={!!busy} onChange={(e) => e.target.value && run('link', () => api.patch(`/domain/${e.target.value}/assign-page`, { builderPageId: page.id, storeId }), t('lp.linked'))} className={input}>
            <option value="">{t('lp.pick_domain')}</option>
            {free.map((d) => <option key={d.id} value={d.id}>{d.domain}</option>)}
          </select>
        ) : <p className="text-xs text-gray-400">{t('lp.no_free_domain')}</p>}
      </div>

      <div className="space-y-1.5"><label className={label}>{t('lp.platform')}</label>
        <div className="flex gap-2">
          <input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="facebook, tiktok…" className={input} />
          <button type="button" disabled={!!busy || platform === (page.platform || '')} onClick={() => run('plat', () => api.patch(`/builder-pages/${page.id}/platform`, { platform: platform.trim() }), t('inventory.saved'))} className="px-4 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold disabled:opacity-50">{t('inventory.save')}</button>
        </div>
      </div>
    </Sheet>
  );
}

export default function LandingPagesPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [pages, setPages] = useState(null);
  const [products, setProducts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    api.get(`/builder-pages/store/${storeId}`).then((r) => setPages(Array.isArray(r.data) ? r.data : r.data?.data ?? [])).catch(() => setPages([]));
  }, [storeId]);
  useEffect(() => {
    setPages(null); load();
    api.get(`/stores/${storeId}/products`).then((r) => setProducts(r.data?.products || r.data?.data || [])).catch(() => {});
  }, [storeId, load]);
  const current = open && pages?.find((p) => p.id === open);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold">{t('nav.landing')} <span className="text-gray-400 text-sm" dir="ltr">{pages?.length ?? ''}</span></h1>
        <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold"><Plus className="w-4 h-4" />{t('lp.new')}</button>
      </div>

      {pages === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : pages.length === 0 ? <div className="flex flex-col items-center gap-3 py-16 text-gray-400 text-center"><LayoutTemplate className="w-10 h-10" /><p className="text-sm max-w-xs">{t('lp.empty')}</p></div>
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pages.map((p) => (
              <button key={p.id} type="button" onClick={() => setOpen(p.id)} className="text-start rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                <div className="h-28 bg-gradient-to-br from-indigo-50 to-emerald-50 dark:from-indigo-500/10 dark:to-emerald-500/5 relative">
                  {p.cover ? <img src={p.cover} alt="" loading="lazy" className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center"><LayoutTemplate className="w-7 h-7 text-indigo-300 dark:text-zinc-600" /></div>}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${p.publishedUrl ? 'bg-emerald-500 text-white' : 'bg-white/90 text-gray-700'}`}>{p.publishedUrl ? t('lp.published') : t('lp.draft')}</span>
                  <span className="absolute top-2 left-2 p-1 rounded-md bg-black/40 text-white"><MoreVertical className="w-3.5 h-3.5" /></span>
                </div>
                <div className="p-3 space-y-2">
                  <p className="flex items-center gap-1.5 font-bold text-sm"><span className={`w-2 h-2 rounded-full shrink-0 ${p.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-600'}`} /><span className="truncate"><bdi>{p.name}</bdi></span>{p.platform && <span className="ms-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 shrink-0">{p.platform}</span>}</p>
                  <p className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span className="w-6 h-6 rounded-md overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">{p.product?.image ? <img src={p.product.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-3 h-3 text-gray-400" />}</span>
                    <span className="truncate" dir="auto">{p.product?.name || t('lp.no_product')}</span>
                  </p>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <span className="rounded-lg bg-gray-50 dark:bg-zinc-800/60 py-1"><b className="block text-sm">{p.showsCount || 0}</b><span className="text-[10px] text-gray-400">{t('lp.views')}</span></span>
                    <span className="rounded-lg bg-gray-50 dark:bg-zinc-800/60 py-1"><b className="block text-sm text-emerald-600">{p.ordersCount || 0}</b><span className="text-[10px] text-gray-400">{t('lp.orders')}</span></span>
                    <span className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 py-1"><b className="block text-sm text-emerald-700 dark:text-emerald-400" dir="ltr">{pageCr(p)}%</b><span className="text-[10px] text-gray-400">CR</span></span>
                  </div>
                  {p.domains?.[0] && <p className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-mono truncate" dir="ltr"><Globe className="w-3 h-3 shrink-0" />{p.domains[0]}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

      {creating && <NewLandingSheet storeId={storeId} products={products} onClose={() => setCreating(false)} onDone={() => { setCreating(false); load(); }} />}
      {current && <PageSheet page={current} storeId={storeId} products={products} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
