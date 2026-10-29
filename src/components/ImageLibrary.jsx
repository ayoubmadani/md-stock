// مكتبة الصور (نفس مكتبة لوحة التاجر): الصور المرفوعة سابقاً في المجلد، رفع مع ضغط، اختيار واحد أو عدة، حذف
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check, ClipboardPaste, ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import CameraCapture from './CameraCapture';
import { ACCEPT, COMPRESS, compress } from '../lib/upload';
import LogoEditor from './LogoEditor';
import { clipboardImages, pastedImages } from '../lib/clipboard';

const PAGE = 18;
/**
 * folder: products | productVariant | category | store
 * max: كم صورة يمكن اختيارها (1 = اختيار مباشر بالضغط)
 * onPick(urls[])
 */
export default function ImageLibrary({ folder = 'products', max = 1, edit = false, onPick, onClose }) {
  const { t } = useTranslation();
  const [images, setImages] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState([]); // روابط بترتيب الاختيار
  const [progress, setProgress] = useState(null); // { done, total, pct }
  const [manage, setManage] = useState(false);
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

  const upload = async (files) => {
    const list = [...files].slice(0, multi ? 10 : 1);
    if (!list.length) return;
    setProgress({ done: 0, total: list.length, pct: 0 });
    const uploaded = [];
    try {
      for (const [i, raw] of list.entries()) {
        const preset = folder in COMPRESS ? COMPRESS[folder] : COMPRESS.products;
        const file = preset ? await compress(raw, preset) : raw;
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

  // edit: صورة جديدة تمرّ بمحرر الشعار (قص + إزالة الأبيض) قبل الرفع
  const [editing, setEditing] = useState(null);
  const receive = (files) => (edit && files?.length ? setEditing(files[0]) : upload(files));

  // صورة من المكتبة: نجلب بايتاتها عبر الـ API (R2 يمنع المتصفح من قراءة البكسلات) ثم المحرر؛ إن تعذّر تُختار كما هي
  const editExisting = async (img) => {
    try {
      const { data } = await api.get(`/images/${img.id}/raw`, { responseType: 'blob' });
      setEditing(new File([data], (img.url.split('/').pop() || 'logo').replace(/\?.*$/, ''), { type: data.type || 'image/png' }));
    } catch { onPick([img.url]); }
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

  const remove = async (img) => {
    if (!window.confirm(t('library.confirm_delete'))) return;
    try {
      await api.delete(`/images/${img.id}`);
      setImages((l) => l.filter((x) => x.id !== img.id));
      setSelected((s) => s.filter((u) => u !== img.url));
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg h-[88dvh] sm:h-[80vh] flex flex-col">
        <div className="flex items-center justify-between gap-2 p-4 pb-3">
          <div className="min-w-0">
            <p className="font-bold">{t(`library.title_${folder}`, t('library.title_products'))}</p>
            {multi && <p className="text-xs text-gray-400">{t('library.pick_up_to', { max })}</p>}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setManage((m) => !m)} className={`p-2 rounded-lg ${manage ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10' : 'text-gray-400'}`} title={t('library.manage')}><Trash2 className="w-5 h-5" /></button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="px-4">
          {progress ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-400 text-sm font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />{t('library.uploading', { done: progress.done + 1, total: progress.total })}
            </div>
          ) : (
            // معرض الصور، أو التصوير مباشرة بالكاميرا الخلفية
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer">
                <ImagePlus className="w-5 h-5" />{t('library.from_gallery')}
                <input type="file" accept={ACCEPT} multiple={multi} hidden onChange={(e) => { receive([...e.target.files]); e.target.value = ''; }} />
              </label>
              <button type="button" onClick={() => setCamera(true)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                <Camera className="w-5 h-5" />{t('library.from_camera')}
              </button>
              <button type="button" onClick={paste} className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400">
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
                    return (
                      <div key={img.id || img.url} className="relative aspect-square">
                        <button type="button" onClick={() => (manage ? remove(img) : edit ? editExisting(img) : toggle(img.url))}
                          className={`w-full h-full rounded-xl overflow-hidden border-2 ${n >= 0 ? 'border-indigo-500' : 'border-transparent'}`}>
                          <img src={img.url} alt="" loading="lazy" className="w-full h-full object-cover bg-gray-100 dark:bg-zinc-800" />
                        </button>
                        {manage ? (
                          <span className="pointer-events-none absolute inset-0 rounded-xl bg-rose-600/40 flex items-center justify-center"><Trash2 className="w-6 h-6 text-white" /></span>
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
        {editing && <LogoEditor file={editing} onCancel={() => setEditing(null)} onDone={(file) => { setEditing(null); upload([file]); }} />}

        {multi && (
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
