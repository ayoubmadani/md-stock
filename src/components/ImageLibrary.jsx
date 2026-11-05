// مكتبة الصور (نفس مكتبة لوحة التاجر): الصور المرفوعة سابقاً في المجلد، رفع مع ضغط، اختيار واحد أو عدة، حذف
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check, ClipboardPaste, FolderOpen, ImagePlus, Loader2, Trash2, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import CameraCapture from './CameraCapture';
import { ACCEPT, COMPRESS, compress } from '../lib/upload';
import ImageEditor from './ImageEditor';
import { clipboardImages, pastedImages } from '../lib/clipboard';
import { longPress } from '../lib/long-press';

const PAGE = 18;
/**
 * folder: products | productVariant | category | store | logo | favicon | hero
 * max: كم صورة يمكن اختيارها (1 = اختيار مباشر بالضغط)
 * onPick(urls[])
 */
/** edit: نوع المحرر (logo | favicon | cover | cover_mobile | image) — قص قبل الرفع */
// كل مجلدات مكتبة صور التاجر — زر المجلدات يعرض أي مجلد (الرفع يذهب إلى المجلد المعروض)
export const LIBRARY_FOLDERS = ['products', 'productVariant', 'category', 'store', 'logo', 'favicon', 'hero'];

export default function ImageLibrary({ folder: initialFolder = 'products', max = 1, edit = null, onPick, onClose }) {
  const [folder, setFolder] = useState(initialFolder);
  const [folderMenu, setFolderMenu] = useState(false);
  const { t } = useTranslation();
  const [images, setImages] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState([]); // روابط بترتيب الاختيار
  const [progress, setProgress] = useState(null); // { done, total, pct }
  // تحديد جماعي للحذف: ضغطة مطوّلة على صورة (أو زر سلة المهملات) ← تتحدد، ثم النقر يحدد/يلغي البقية
  const [bulk, setBulk] = useState(null); // null = خارج وضع التحديد، وإلا Set من معرّفات الصور
  const [deleting, setDeleting] = useState(false);
  const [camera, setCamera] = useState(false);
  const multi = max > 1;

  const fetchPage = useCallback(async (p) => {
    const { data } = await api.get('/images', { params: { page: p, limit: PAGE, folder } });
    setHasMore(data.page < data.totalPages);
    setPage(p);
    return data.images || [];
  }, [folder]);

  useEffect(() => { fetchPage(1).then(setImages).catch(() => setImages([])); }, [fetchPage]);

  // بلا تمرير للصفحة خلف النافذة
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const more = async () => {
    setLoadingMore(true);
    try { const list = await fetchPage(page + 1); setImages((l) => [...l, ...list]); } finally { setLoadingMore(false); }
  };

  const toggle = (url) => {
    if (!multi) { onPick([url]); return; }
    setSelected((s) => {
      if (s.includes(url)) return s.filter((x) => x !== url);
      if (s.length >= max) { toast.error(t('library.max', { max })); return s; }
      return [...s, url];
    });
  };

  // asIs: صورة خرجت من المحرر (مقصوصة ومضغوطة) تُرفع كما هي
  const upload = async (files, { asIs = false } = {}) => {
    const list = [...files].slice(0, multi ? 10 : 1);
    if (!list.length) return;
    setProgress({ done: 0, total: list.length, pct: 0 });
    const uploaded = [];
    try {
      for (const [i, raw] of list.entries()) {
        const preset = folder in COMPRESS ? COMPRESS[folder] : COMPRESS.products;
        const file = preset && !asIs ? await compress(raw, preset) : raw;
        const body = new FormData();
        body.append('file', file);
        const { data } = await api.post(`/images/upload?folder=${folder}`, body, {
          onUploadProgress: (e) => setProgress({ done: i, total: list.length, pct: Math.round(((i + (e.total ? e.loaded / e.total : 0)) / list.length) * 100) }),
        });
        if (data?.url) uploaded.push(data);
      }
    } catch (e) {
      toast.error(errorMessage(e, t('library.upload_failed')));
    } finally {
      setProgress(null);
    }
    if (!uploaded.length) return;
    setImages((l) => [...uploaded, ...(l || [])]);
    // المرفوع يُختار تلقائياً
    if (!multi) onPick([uploaded[0].url]);
    else setSelected((s) => [...s, ...uploaded.map((u) => u.url).filter((u) => !s.includes(u))].slice(0, max));
  };

  // edit: صورة واحدة جديدة تمرّ بالمحرر قبل الرفع؛ editing = { file, url? } (url لصورة من المكتبة)
  const [editing, setEditing] = useState(null);
  const receive = (files) => (edit && files?.length === 1 ? setEditing({ file: files[0] }) : upload(files));
  const edited = (file, changed) => {
    const { url } = editing;
    setEditing(null);
    if (url && !changed) { if (!multi || !selected.includes(url)) toggle(url); return; }
    upload([file], { asIs: true });
  };

  // صورة من المكتبة: نجلب بايتاتها عبر الـ API (R2 يمنع المتصفح من قراءة البكسلات) ثم المحرر؛ إن تعذّر تُختار كما هي
  const editExisting = async (img) => {
    try {
      const { data } = await api.get(`/images/${img.id}/raw`, { responseType: 'blob' });
      setEditing({ url: img.url, file: new File([data], (img.url.split('/').pop() || 'image').replace(/\?.*$/, ''), { type: data.type || 'image/png' }) });
    } catch { toggle(img.url); }
  };

  // لصق صورة منسوخة: زر «لصق» (الهاتف) أو Ctrl+V (الحاسوب)
  const paste = async () => {
    try {
      const files = await clipboardImages();
      if (files.length) receive(files); else toast.error(t('library.paste_empty'));
    } catch { toast.error(t('library.paste_failed')); }
  };
  const uploadRef = useRef(upload);
  uploadRef.current = receive;
  useEffect(() => {
    if (camera) return undefined;
    const onPaste = (e) => { const files = pastedImages(e.clipboardData); if (files.length) { e.preventDefault(); uploadRef.current(files); } };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [camera]);

  const toggleBulk = (id) => setBulk((b) => { const n = new Set(b || []); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const removeSelected = async () => {
    const ids = [...(bulk || [])];
    if (!ids.length || !window.confirm(t('library.confirm_delete_many', { count: ids.length }))) return;
    setDeleting(true);
    try {
      await api.delete('/images/batch', { data: { ids } });
      const gone = new Set(ids);
      const urls = new Set((images || []).filter((x) => gone.has(x.id)).map((x) => x.url));
      setImages((l) => l.filter((x) => !gone.has(x.id)));
      setSelected((sel) => sel.filter((u) => !urls.has(u)));
      setBulk(null);
      toast.success(t('library.deleted_many', { count: ids.length }));
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg h-[88dvh] sm:h-[80vh] flex flex-col">
        <div className="relative flex items-center justify-between gap-2 p-4 pb-3">
          <button type="button" onClick={() => setFolderMenu((v) => !v)} title={t('library.folders')}
            className={`p-2 rounded-lg shrink-0 ${folderMenu ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10' : 'text-gray-400'}`}><FolderOpen className="w-5 h-5" /></button>
          {folderMenu && (
            <div className="absolute top-14 start-4 z-10 w-56 p-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl">
              {LIBRARY_FOLDERS.map((f) => (
                <button key={f} type="button" onClick={() => { setFolderMenu(false); if (f !== folder) { setImages(null); setBulk(null); setFolder(f); } }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-start ${f === folder ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 font-bold' : 'text-gray-700 dark:text-zinc-200'}`}>
                  <FolderOpen className="w-4 h-4 shrink-0 opacity-70" /><span className="flex-1 truncate">{t(`library.title_${f}`)}</span>{f === folder && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold">{t(`library.title_${folder}`, t('library.title_products'))}</p>
            {multi && <p className="text-xs text-gray-400">{t('library.pick_up_to', { max })}</p>}
          </div>
          <div className="flex items-center gap-1">
            {bulk && <span className="text-xs font-bold text-rose-500 px-1">{t('library.selected_count', { count: bulk.size })}</span>}
            <button type="button" onClick={() => setBulk((b) => (b ? null : new Set()))} className={`p-2 rounded-lg ${bulk ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' : 'text-gray-400'}`} title={bulk ? t('library.cancel_select') : t('library.manage')}>{bulk ? <X className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}</button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="px-4">
          {progress ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-400 text-sm font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />{t('library.uploading', { done: progress.done + 1, total: progress.total })}
            </div>
          ) : (
            // معرض الصور، أو التصوير مباشرة بالكاميرا الخلفية، أو اللصق — الأيقونة فوق النص (لا يلتف «Appareil photo» بجانبها)
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-xs font-bold whitespace-nowrap text-gray-500 dark:text-zinc-400 cursor-pointer">
                <ImagePlus className="w-5 h-5" />{t('library.from_gallery')}
                <input type="file" accept={ACCEPT} multiple={multi} hidden onChange={(e) => { receive([...e.target.files]); e.target.value = ''; }} />
              </label>
              <button type="button" onClick={() => setCamera(true)} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-xs font-bold text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                <Camera className="w-5 h-5" />{t('library.from_camera')}
              </button>
              <button type="button" onClick={paste} className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-xs font-bold whitespace-nowrap text-gray-500 dark:text-zinc-400">
                <ClipboardPaste className="w-5 h-5" />{t('library.paste')}
              </button>
            </div>
          )}
          {progress && <div className="h-1 rounded-full bg-gray-100 dark:bg-zinc-800 mt-2 overflow-hidden"><div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress.pct}%` }} /></div>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-3">
          {images === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            : images.length === 0 ? <p className="text-center text-sm text-gray-400 py-12">{t('library.empty')}</p>
            : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img) => {
                    const n = selected.indexOf(img.url);
                    const marked = !!bulk?.has(img.id);
                    const press = longPress({
                      onLong: () => { if (img.id) setBulk((b) => new Set([...(b || []), img.id])); navigator.vibrate?.(30); },
                      onClick: () => (bulk ? img.id && toggleBulk(img.id) : edit && !multi ? editExisting(img) : toggle(img.url)),
                    });
                    return (
                      <div key={img.id || img.url} className="relative aspect-square">
                        <button type="button" {...press}
                          className={`w-full h-full rounded-xl overflow-hidden border-2 select-none [-webkit-touch-callout:none] ${marked ? 'border-rose-500' : n >= 0 && !bulk ? 'border-indigo-500' : 'border-transparent'}`}>
                          <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover bg-gray-100 dark:bg-zinc-800" />
                        </button>
                        {edit && multi && !bulk && (
                          <button type="button" onClick={() => editExisting(img)} aria-label={t('image_editor.edit')}
                            className="absolute bottom-1.5 start-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
                        )}
                        {bulk ? (
                          <span className={`pointer-events-none absolute top-1.5 end-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${marked ? 'bg-rose-500 border-rose-500 text-white' : 'bg-black/30 border-white'}`}>
                            {marked && <Check className="w-4 h-4" />}
                          </span>
                        ) : n >= 0 && (
                          <span className="pointer-events-none absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                            {multi ? n + 1 : <Check className="w-4 h-4" />}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasMore && (
                  <button type="button" onClick={more} disabled={loadingMore} className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-600 dark:text-zinc-300">
                    {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}{t('orders.more')}
                  </button>
                )}
              </>
            )}
        </div>

        {camera && <CameraCapture onClose={() => setCamera(false)} onCapture={(file) => { setCamera(false); receive([file]); }} />}
        {editing && <ImageEditor file={editing.file} kind={edit} onCancel={() => setEditing(null)} onDone={edited} />}

        {bulk ? (
          <div className="p-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" disabled={!bulk.size || deleting} onClick={removeSelected}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-rose-600 text-white font-bold disabled:opacity-50">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{t('library.delete_selected', { count: bulk.size })}
            </button>
          </div>
        ) : multi && (
          <div className="p-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" disabled={!selected.length} onClick={() => onPick(selected)}
              className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
              {t('library.add', { count: selected.length })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
