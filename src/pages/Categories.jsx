// التصنيفات: شجرة بمستوياتها، إضافة/تعديل من نافذة سفلية (صورة من المكتبة، أب، تفعيل)، حذف
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, FolderTree, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { flattenTree, parentOptions } from '../lib/store-setup';
import ImageLibrary from '../components/ImageLibrary';
import { Toggle, input, label } from '../components/product';

const EMPTY = { name: '', slug: '', description: '', imageUrl: '', parentId: '', sortOrder: 0, isActive: true };

function CategorySheet({ storeId, tree, category, onClose, onSaved }) {
  const { t } = useTranslation();
  const [f, setF] = useState(() => (category ? {
    name: category.name || '', slug: category.slug || '', description: category.description || '', imageUrl: category.imageUrl || '',
    parentId: category.parentId || '', sortOrder: Number(category.sortOrder) || 0, isActive: category.isActive ?? true,
  } : EMPTY));
  const [saving, setSaving] = useState(false);
  const [library, setLibrary] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v?.target ? v.target.value : v }));

  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error(t('categories.name_required'));
    setSaving(true);
    try {
      // نفس جسم اللوحة: parentId فارغ ← بلا أب
      const body = { ...f, name: f.name.trim(), parentId: f.parentId || (category ? null : undefined), slug: f.slug.trim() || undefined, sortOrder: Number(f.sortOrder) || 0 };
      if (category) await api.patch(`/stores/${storeId}/categories/${category.id}`, body);
      else await api.post(`/stores/${storeId}/categories`, body);
      toast.success(t('inventory.saved'));
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={save} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 max-h-[92dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{category ? t('categories.edit') : t('categories.new')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => setLibrary(true)} className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center text-gray-400">
            {f.imageUrl ? <img src={f.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-6 h-6" />}
          </button>
          <div className="flex-1 min-w-0 space-y-1.5">
            <label className={label}>{t('categories.name')}</label>
            <input value={f.name} onChange={set('name')} className={input} autoFocus={!category} />
            {f.imageUrl && <button type="button" onClick={() => set('imageUrl')('')} className="text-xs text-rose-500">{t('categories.remove_image')}</button>}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className={label}>{t('categories.parent')}</label>
          <select value={f.parentId} onChange={set('parentId')} className={input}>
            <option value="">{t('categories.no_parent')}</option>
            {parentOptions(tree, category?.id).map((c) => <option key={c.id} value={c.id}>{`${'— '.repeat(c.level)}${c.name}`}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><label className={label}>{t('categories.description')}</label><textarea rows={2} value={f.description} onChange={set('description')} className={input} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={label}>{t('categories.slug')}</label><input dir="ltr" value={f.slug} onChange={set('slug')} placeholder="auto" className={input} /></div>
          <div className="space-y-1.5"><label className={label}>{t('categories.order')}</label><input type="number" inputMode="numeric" dir="ltr" value={f.sortOrder} onChange={set('sortOrder')} className={input} /></div>
        </div>
        <Toggle checked={f.isActive} onChange={set('isActive')}>{t('categories.visible')}</Toggle>
        <button disabled={saving} className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-60">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('inventory.save')}
        </button>
        {library && <ImageLibrary folder="category" max={1} onPick={([u]) => { setLibrary(false); set('imageUrl')(u); }} onClose={() => setLibrary(false)} />}
      </form>
    </div>
  );
}

export default function CategoriesPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [tree, setTree] = useState(null);
  const [sheet, setSheet] = useState(null); // { category } | { category: null }

  const load = useCallback(() => {
    api.get(`/stores/${storeId}/categories`).then((r) => setTree(r.data?.data || r.data || [])).catch(() => setTree([]));
  }, [storeId]);
  useEffect(() => { load(); }, [load]);

  const remove = async (c) => {
    const kids = c.children?.length || 0;
    const products = c.products?.length || 0;
    const warn = [kids && t('categories.has_children', { count: kids }), products && t('categories.has_products', { count: products })].filter(Boolean).join('\n');
    if (!window.confirm(`${t('categories.confirm_delete', { name: c.name })}${warn ? `\n${warn}` : ''}`)) return;
    try {
      await api.delete(`/stores/${storeId}/categories/${c.id}`);
      toast.success(t('categories.deleted'));
      load();
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    }
  };

  if (!tree) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  const rows = flattenTree(tree);

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="font-bold">{t('nav.categories')} <span className="text-gray-400 text-sm" dir="ltr">{rows.length}</span></h1>
        <button type="button" onClick={() => setSheet({ category: null })} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
          <Plus className="w-4 h-4" />{t('categories.new')}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <FolderTree className="w-10 h-10" />
          <p className="text-sm">{t('categories.empty')}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3" style={{ paddingInlineStart: `${12 + c.level * 20}px` }}>
              <button type="button" onClick={() => setSheet({ category: c })} className="flex-1 min-w-0 flex items-center gap-3 text-start">
                <span className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                  {c.imageUrl ? <img src={c.imageUrl} alt="" className="w-full h-full object-cover" /> : <FolderTree className="w-4 h-4 text-gray-400" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-semibold truncate ${c.isActive === false ? 'text-gray-400 line-through' : ''}`}><bdi>{c.name}</bdi></span>
                  <span className="block text-[11px] text-gray-400">{t('categories.products', { count: c.products?.length || 0 })}</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-gray-300 ltr:rotate-180 shrink-0" />
              </button>
              <button type="button" onClick={() => remove(c)} className="p-2 rounded-lg text-gray-300 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      {sheet && <CategorySheet storeId={storeId} tree={tree} category={sheet.category} onClose={() => setSheet(null)} onSaved={() => { setSheet(null); load(); }} />}
    </div>
  );
}
