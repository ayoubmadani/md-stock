// أجزاء نموذج المنتج للهاتف: الصور، الوصف، الخصائص، النسخ، العروض
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Bold, Eye, EyeOff, ImagePlus, Italic, List, Loader2, Plus, Printer, ScanLine, Star, Trash2, Wand2, X, Palette, Check } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { effectiveVariantPrice, moveItem, newAddon, newAttribute, newOffer, newValue, variantPriceField, linkVariantImage, COLOR_PALETTE, replaceValue, addValues, uniqueAttrName, duplicateAttrIds } from '../lib/product-form';
import Scanner from './Scanner';
import { fillMissingBarcodes, randomStoreEan13 } from '../lib/barcode';
import { printLabel } from '../lib/label';
import { useAuth } from '../lib/auth';
import ImageLibrary from './ImageLibrary';
import { VariantParts, variantLabel } from './inventory';

export const input = 'w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400';
export const label = 'text-xs font-semibold text-gray-500 dark:text-zinc-400';
export const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4 space-y-3';
const small = 'px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-indigo-400';

export function Section({ title, children, action }) {
  return (
    <section className={box}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-sm">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Toggle({ checked, onChange, children }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1 cursor-pointer">
      <span className="text-sm">{children}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-700'}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'start-6' : 'start-1'}`} />
      </button>
    </label>
  );
}

/* ── الصور: الأولى هي الرئيسية، أسهم للترتيب ── */
// حد صور المنتج في خطة صاحب المتجر (الخادم يتحقق أيضاً)
let planMax = null;
const loadPlanMax = () => (planMax !== null ? Promise.resolve(planMax)
  : api.get('/subscription/my').then(({ data }) => (planMax = Number(data?.plan?.features?.productImagesNumber) || 0)).catch(() => 0));

export function ImagesEditor({ images, onChange }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState(0);
  useEffect(() => { loadPlanMax().then(setLimit); }, []);
  const rtl = i18n.dir() === 'rtl';
  const room = limit ? Math.max(0, limit - images.length) : 10;
  const pick = (urls) => {
    setOpen(false);
    onChange([...images, ...urls.filter((u) => !images.includes(u))]);
  };
  // «قبل» في القراءة = يمين في العربية
  const Before = rtl ? ChevronRight : ChevronLeft;
  const After = rtl ? ChevronLeft : ChevronRight;
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      <button type="button" onClick={() => (room ? setOpen(true) : toast.error(t('library.max', { max: limit })))}
        className="shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-1 text-gray-400 text-[11px]">
        <ImagePlus className="w-6 h-6" />
        {t('product.add_images')}
        {limit > 0 && <span dir="ltr">{images.length}/{limit}</span>}
      </button>
      {open && <ImageLibrary folder="products" max={room} edit="image" onPick={pick} onClose={() => setOpen(false)} />}
      {images.map((src, i) => (
        <div key={src} className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800">
          <img src={src} alt="" className="w-full h-full object-cover" />
          {i === 0 && <span className="absolute top-1 start-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold"><Star className="w-3 h-3" />{t('product.main')}</span>}
          <button type="button" onClick={() => onChange(images.filter((x) => x !== src))} className="absolute top-1 end-1 p-0.5 rounded-md bg-black/60 text-white"><X className="w-3.5 h-3.5" /></button>
          <div className="absolute bottom-1 inset-x-1 flex justify-between">
            <button type="button" disabled={i === 0} onClick={() => onChange(moveItem(images, i, -1))} className="p-0.5 rounded-md bg-black/60 text-white disabled:opacity-0"><Before className="w-4 h-4" /></button>
            <button type="button" disabled={i === images.length - 1} onClick={() => onChange(moveItem(images, i, 1))} className="p-0.5 rounded-md bg-black/60 text-white disabled:opacity-0"><After className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── الوصف: نص منسّق بسيط (عريض، مائل، قائمة) — نفس HTML الذي تحفظه اللوحة ── */
export function DescEditor({ value, onChange }) {
  const ref = useRef(null);
  // القيمة الأولى فقط — بعدها المحرّر هو المصدر (لا نعيد الكتابة فوق المؤشر)
  useEffect(() => { if (ref.current && !ref.current.dataset.ready) { ref.current.innerHTML = value || ''; ref.current.dataset.ready = '1'; } }, [value]);
  const cmd = (c) => { document.execCommand(c); ref.current?.focus(); onChange(ref.current?.innerHTML || ''); };
  const btn = 'p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800';
  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
      <div className="flex gap-1 p-1 border-b border-gray-100 dark:border-zinc-800">
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd('bold'); }} className={btn}><Bold className="w-4 h-4" /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd('italic'); }} className={btn}><Italic className="w-4 h-4" /></button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd('insertUnorderedList'); }} className={btn}><List className="w-4 h-4" /></button>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning dir="auto"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[120px] p-3 text-sm outline-none [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:list-decimal [&_ol]:ps-5" />
    </div>
  );
}

/* ── نافذة الألوان: درجات جاهزة + لون مخصص. الإضافة تقبل عدة ألوان، والتعديل لوناً واحداً ── */
function ColorSheet({ initial, editing, existing = [], onSave, onClose }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [hex, setHex] = useState(initial);
  const [picked, setPicked] = useState([]);
  const setCurrent = (c) => { setValue(c); setHex(c); };
  const toggle = (c) => setPicked((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  const tap = (c) => { setCurrent(c); if (!editing) toggle(c); };
  const on = (c) => (editing ? value === c : picked.includes(c));
  const save = () => (editing ? onSave(value) : onSave(picked.length ? picked : [value]));
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md h-[80dvh] sm:h-[640px] flex flex-col p-4 gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{t(editing ? 'product.attr.edit_color' : 'product.attr.add_color_btn')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        {!editing && <p className="text-[11px] text-gray-400">{t('product.attr.multi_hint')}</p>}
        {/* الألوان وحدها تتمرر؛ الرأس واللون المخصص والمختارة وزر الإضافة ثابتة */}
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 py-1 overscroll-contain">
        <div className="space-y-1.5" dir="ltr">
          {COLOR_PALETTE.map((row) => (
            <div key={row[0]} className="grid grid-cols-5 gap-1.5">
              {row.map((c) => (
                <button key={c} type="button" onClick={() => tap(c)} aria-label={c} disabled={!editing && existing.includes(c)}
                  className={`relative h-9 rounded-lg border border-gray-200 dark:border-zinc-700 disabled:opacity-30 ${on(c) ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-zinc-900' : ''}`} style={{ backgroundColor: c }}>
                  {on(c) && !editing && <Check className="absolute inset-0 m-auto w-4 h-4" style={{ color: ['#ffffff', '#e5e7eb', '#fef08a', '#fed7aa', '#bbf7d0', '#a5f3fc', '#f5e6d3', '#fecaca', '#bfdbfe', '#ddd6fe', '#fbcfe8', '#facc15'].includes(c) ? '#111' : '#fff' }} />}
                </button>
              ))}
            </div>
          ))}
        </div>
        </div>
        <div className="shrink-0 flex items-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-700 p-2">
          <span className="text-xs font-semibold text-gray-500 flex-1">{t('product.attr.custom_color')}</span>
          <input type="color" value={value} onChange={(e) => setCurrent(e.target.value)} className="w-10 h-9 rounded-lg bg-transparent border-0 p-0" />
          <input value={hex} dir="ltr" maxLength={7} onChange={(e) => { const h = e.target.value.trim(); setHex(h); if (/^#[0-9a-fA-F]{6}$/.test(h)) setValue(h.toLowerCase()); }}
            className="w-24 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-sm font-mono" />
          {!editing && (
            <button type="button" onClick={() => !picked.includes(value) && !existing.includes(value) && setPicked((l) => [...l, value])} aria-label={t('product.attr.add_custom')}
              className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"><Plus className="w-4 h-4" /></button>
          )}
        </div>
        {!editing && (
          // الألوان المختارة: إطار ثابت بارتفاع سطرين، وما زاد يتمرر داخله
          <div className="shrink-0 h-[80px] p-2 rounded-xl border border-dashed border-gray-200 dark:border-zinc-700 overflow-y-auto overscroll-contain flex flex-wrap content-start gap-1.5" dir="ltr">
            {picked.length === 0 && <span className="m-auto text-[11px] text-gray-400" dir="auto">{t('product.attr.none_picked')}</span>}
            {picked.map((c) => (
              <button key={c} type="button" onClick={() => toggle(c)} className="shrink-0 w-7 h-7 rounded-md border border-gray-200 dark:border-zinc-700" style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 shrink-0">
          {editing && <span className="w-11 h-11 rounded-xl border border-gray-200 dark:border-zinc-700 shrink-0" style={{ backgroundColor: value }} />}
          <button type="button" onClick={save} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold">
            {editing ? t('inventory.save') : t('product.attr.add_n_colors', { count: picked.length || 1 })}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── خاصية واحدة وقيمها ── */
function AttributeCard({ attr, images = [], duplicate = false, onChange, onRemove }) {
  const { t } = useTranslation();
  const [pickFor, setPickFor] = useState(null); // قيمة لون تُربط بصورة من صور المنتج
  const [text, setText] = useState('');
  const [colorSheet, setColorSheet] = useState(null); // { id?, value } — إضافة لون أو تعديله
  const [library, setLibrary] = useState(false);
  const mode = attr.type === 'color' ? attr.displayMode || 'color' : 'text';
  const addValue = (v) => {
    const value = String(v || '').trim();
    if (!value) return;
    if (attr.variants.some((x) => x.value === value)) return toast.error(t('product.attr.duplicate_value'));
    onChange({ ...attr, variants: [...attr.variants, newValue(value)] });
  };
  return (
    <div className="rounded-xl border border-gray-100 dark:border-zinc-800 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <input value={attr.name} onChange={(e) => onChange({ ...attr, name: e.target.value })} placeholder={t('product.attr.name')} aria-invalid={duplicate} className={`${small} flex-1 min-w-0 font-semibold ${duplicate ? '!border-rose-500' : ''}`} />
        <button type="button" onClick={onRemove} className="p-2 rounded-lg text-rose-500"><Trash2 className="w-4 h-4" /></button>
      </div>
      {duplicate && <p className="text-[11px] font-semibold text-rose-500">{t('product.attr.duplicate_name')}</p>}
      {attr.type === 'color' && (
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800">
          {['color', 'image', 'text'].map((m) => (
            <button key={m} type="button" onClick={() => mode !== m && onChange({ ...attr, displayMode: m, variants: [] })}
              className={`py-1.5 rounded-lg text-xs font-bold ${mode === m ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'text-gray-500'}`}>{t(`product.attr.mode_${m}`)}</button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {attr.variants.map((v) => (
          <span key={v.id} className="inline-flex items-center gap-1 ps-1 pe-1.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 text-sm">
            {mode === 'color' ? <button type="button" onClick={() => setColorSheet({ id: v.id, value: v.value })} aria-label={t('product.attr.edit_color')} className="w-6 h-6 rounded-md border border-gray-200 dark:border-zinc-700" style={{ backgroundColor: v.value }} />
              : mode === 'image' ? <img src={v.value} alt="" className="w-8 h-8 rounded-md object-cover" />
                : <span className="px-1.5 font-semibold">{v.value}</span>}
            {attr.type === 'color' && (
              <button type="button" onClick={() => setPickFor(v.id)} aria-label={t('product.attr.link_image')}
                className="w-7 h-7 rounded-md overflow-hidden border border-dashed border-gray-300 dark:border-zinc-600 flex items-center justify-center text-gray-400">
                {v.imageUrl ? <img src={v.imageUrl} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-3.5 h-3.5" />}
              </button>
            )}
            <button type="button" onClick={() => onChange({ ...attr, variants: attr.variants.filter((x) => x.id !== v.id) })} className="text-gray-400"><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
      </div>
      {pickFor && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={(e) => e.target === e.currentTarget && setPickFor(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <p className="font-bold">{t('product.attr.pick_image')}</p>
              <button type="button" onClick={() => setPickFor(null)} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            {images.length === 0 && <p className="text-center text-sm text-gray-400 py-6">{t('product.attr.no_product_images')}</p>}
            <div className="grid grid-cols-4 gap-2">
              {images.map((src) => {
                const on = attr.variants.find((x) => x.id === pickFor)?.imageUrl === src;
                return (
                  <button key={src} type="button" onClick={() => { onChange(linkVariantImage(attr, pickFor, src)); setPickFor(null); }}
                    className={`aspect-square rounded-xl overflow-hidden border-2 ${on ? 'border-indigo-500' : 'border-transparent'}`}>
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => { onChange(linkVariantImage(attr, pickFor, null)); setPickFor(null); }} className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-semibold text-gray-500">{t('product.attr.unlink_image')}</button>
          </div>
        </div>
      )}
      {mode === 'text' && (
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addValue(text); setText(''); } }}
            placeholder={t('product.attr.value')} className={`${small} flex-1 min-w-0`} />
          <button type="button" onClick={() => { addValue(text); setText(''); }} className="px-3 rounded-xl bg-indigo-600 text-white"><Plus className="w-4 h-4" /></button>
        </div>
      )}
      {mode === 'color' && (
        <button type="button" onClick={() => setColorSheet({ value: '#000000' })} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400">
          <Palette className="w-4 h-4" />{t('product.attr.add_color_btn')}
        </button>
      )}
      {colorSheet && (
        <ColorSheet initial={colorSheet.value} editing={!!colorSheet.id} existing={attr.variants.map((v) => v.value)} onClose={() => setColorSheet(null)}
          onSave={(value) => {
            if (!colorSheet.id) { onChange(addValues(attr, value)); setColorSheet(null); return; }
            const next = replaceValue(attr, colorSheet.id, value);
            if (!next) { toast.error(t('product.attr.duplicate_value')); return; }
            onChange(next); setColorSheet(null);
          }} />
      )}
      {mode === 'image' && (
        <>
          <button type="button" onClick={() => setLibrary(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            <ImagePlus className="w-4 h-4" />{t('product.attr.add_image')}
          </button>
          {library && <ImageLibrary folder="productVariant" max={1} edit="image" onPick={([u]) => { setLibrary(false); addValue(u); }} onClose={() => setLibrary(false)} />}
        </>
      )}
    </div>
  );
}

export function AttributesEditor({ attributes, images, onChange }) {
  const { t } = useTranslation();
  const add = (type) => onChange([...attributes, newAttribute(type, uniqueAttrName(attributes, t(`product.attr.default_${type}`)))]);
  const dups = duplicateAttrIds(attributes);
  return (
    <div className="space-y-3">
      {attributes.length === 0 && <p className="text-xs text-gray-400">{t('product.attr.none')}</p>}
      {attributes.map((a) => (
        <AttributeCard key={a.id} attr={a} images={images} duplicate={dups.has(a.id)} onChange={(next) => onChange(attributes.map((x) => (x.id === a.id ? next : x)))} onRemove={() => onChange(attributes.filter((x) => x.id !== a.id))} />
      ))}
      <div className="grid grid-cols-3 gap-2">
        {['color', 'size', 'text'].map((type) => (
          <button key={type} type="button" onClick={() => add(type)} className="flex items-center justify-center gap-1 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-bold">
            <Plus className="w-3.5 h-3.5" />{t(`product.attr.add_${type}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── النسخ المحفوظة: سعر، كمية، باركود، تفعيل — تُحفظ كل خانة عند الخروج منها ── */
function ScanSheet({ onCode, onClose }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{t('scan.title')}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <Scanner onDetected={(c) => { onCode(c); onClose(); }} />
      </div>
    </div>
  );
}

/** باركود جديد غير مستعمل في المتجر (404 من البحث = متاح) */
export async function freshBarcode(storeId) {
  for (let i = 0; i < 5; i++) {
    const code = randomStoreEan13();
    try {
      await api.get(`/stores/${storeId}/inventory/barcode/${code}`);
    } catch (e) {
      if (e.response?.status === 404) return code;
      throw e;
    }
  }
  throw new Error('no free barcode');
}

/** label: { name, variant, price } — يظهر زر طباعة الملصق متى وُجد باركود */
export function BarcodeField({ value, onChange, onCommit, className = input, label }) {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [scan, setScan] = useState(false);
  const [busy, setBusy] = useState(false);
  const generate = async () => {
    if (value?.trim() && !window.confirm(t('product.barcode_replace'))) return;
    setBusy(true);
    try {
      const code = await freshBarcode(storeId);
      onChange(code);
      onCommit?.(code);
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => onCommit?.(value)} dir="ltr" inputMode="numeric" placeholder={t('product.barcode_ph')} className={`${className} min-w-0`} />
      <button type="button" onClick={generate} disabled={busy} className="shrink-0 px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 disabled:opacity-60" title={t('product.barcode_generate')}>
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
      </button>
      <button type="button" onClick={() => setScan(true)} className="shrink-0 px-3.5 rounded-xl bg-indigo-600 text-white" title={t('scan.title')}><ScanLine className="w-5 h-5" /></button>
      {label && value?.trim() && (
        <button type="button" onClick={() => printLabel(value.trim(), label)} className="shrink-0 px-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200" title={t('product.print_label')} aria-label={t('product.print_label')}><Printer className="w-5 h-5" /></button>
      )}
      {scan && <ScanSheet onClose={() => setScan(false)} onCode={(c) => { onChange(c); onCommit?.(c); }} />}
    </div>
  );
}

function VariantRow({ v, storeId, productId, productName, productPrice, onSaved }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ price: variantPriceField(v.price), stock: String(v.stock ?? 0), barcode: v.barcode || '' });
  const [active, setActive] = useState(v.isActive !== false);
  const save = async (field, raw) => {
    // سعر فارغ = يبقى سعر المنتج (-1) — لا حفظ
    if (field === 'price' && String(raw).trim() === '') { setF((s) => ({ ...s, price: variantPriceField(v.price) })); return; }
    const value = field === 'barcode' ? (raw.trim() || null) : Number(raw);
    const old = field === 'barcode' ? (v.barcode || null) : Number(v[field]);
    if (value === old || (field !== 'barcode' && !Number.isFinite(value))) return;
    try {
      await api.patch(`/stores/${storeId}/products/${productId}/variants/${v.id}`, { [field]: value });
      v[field] = value;
      onSaved?.();
      toast.success(t('inventory.saved'));
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
      setF((s) => ({ ...s, [field]: field === 'barcode' ? (v.barcode || '') : field === 'price' ? variantPriceField(v.price) : String(v[field] ?? '') }));
    }
  };
  const toggle = async () => {
    try {
      const { data } = await api.patch(`/stores/${storeId}/products/${productId}/variants/${v.id}/toggle-active`, {});
      setActive((data?.data || data)?.isActive ?? !active);
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); }
  };
  return (
    <div className={`rounded-xl border border-gray-100 dark:border-zinc-800 p-3 space-y-2.5 ${active ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between gap-2">
        <VariantParts parts={v.name} className="text-sm font-semibold" />
        <Toggle checked={active} onChange={toggle}><span className="text-xs text-gray-400">{active ? t('product.active') : t('product.inactive')}</span></Toggle>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1"><span className="text-[11px] text-gray-400">{t('product.price')}</span>
          <input type="number" inputMode="decimal" dir="ltr" value={f.price} placeholder={productPrice !== '' && productPrice != null ? String(productPrice) : ''} onChange={(e) => setF({ ...f, price: e.target.value })} onBlur={() => save('price', f.price)} className={`${small} w-full`} /></label>
        <label className="space-y-1"><span className="text-[11px] text-gray-400">{t('inventory.col.stock')}</span>
          <input type="number" inputMode="numeric" dir="ltr" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} onBlur={() => save('stock', f.stock)} className={`${small} w-full`} /></label>
      </div>
      <BarcodeField value={f.barcode} onChange={(b) => setF({ ...f, barcode: b })} onCommit={(b) => save('barcode', b)} className={`${small} w-full`}
        label={{ name: productName, variant: variantLabel(v.name), price: effectiveVariantPrice(f.price, productPrice) }} />
    </div>
  );
}

export function VariantsEditor({ variants, storeId, productId, productName, productPrice, dirty }) {
  const { t } = useTranslation();
  const [bulk, setBulk] = useState(false);
  const [ver, setVer] = useState(0); // يعيد رسم الصفوف بعد التوليد الجماعي
  const missing = variants.filter((v) => !String(v.barcode ?? '').trim()).length;
  // باركود لكل نسخة بلا باركود (القائم لا يتغير) ويُحفظ مباشرة
  const generateAll = async () => {
    setBulk(true);
    try {
      const current = Object.fromEntries(variants.map((v) => [v.id, v.barcode || '']));
      const codes = await fillMissingBarcodes(variants.map((v) => v.id), current, () => freshBarcode(storeId));
      for (const v of variants) {
        if (!codes[v.id]) continue;
        await api.patch(`/stores/${storeId}/products/${productId}/variants/${v.id}`, { barcode: codes[v.id] });
        v.barcode = codes[v.id];
      }
      toast.success(t('product.barcodes_done', { count: Object.keys(codes).length }));
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    } finally {
      setVer((n) => n + 1);
      setBulk(false);
    }
  };
  return (
    <div className="space-y-2">
      {dirty && <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded-lg p-2">{t('product.variants_dirty')}</p>}
      {missing > 0 && (
        <button type="button" onClick={generateAll} disabled={bulk} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-500/40 text-sm font-bold text-indigo-600 dark:text-indigo-400 disabled:opacity-60">
          {bulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}{t('product.barcodes_all', { count: missing })}
        </button>
      )}
      {variants.map((v) => <VariantRow key={`${v.id}-${ver}`} v={v} storeId={storeId} productId={productId} productName={productName} productPrice={productPrice} />)}
    </div>
  );
}

/* ── العروض: كمية بسعر ── */
export function OffersEditor({ offers, onChange }) {
  const { t } = useTranslation();
  const set = (id, patch) => onChange(offers.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  return (
    <div className="space-y-2">
      {offers.map((o) => (
        <div key={o.id} className="rounded-xl border border-gray-100 dark:border-zinc-800 p-3 space-y-2">
          <div className="flex gap-2">
            <input value={o.name} onChange={(e) => set(o.id, { name: e.target.value })} placeholder={t('product.offer.name')} className={`${small} flex-1 min-w-0`} />
            <button type="button" onClick={() => onChange(offers.filter((x) => x.id !== o.id))} className="p-2 rounded-lg text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1"><span className="text-[11px] text-gray-400">{t('product.offer.quantity')}</span>
              <input type="number" inputMode="numeric" dir="ltr" value={o.quantity} onChange={(e) => set(o.id, { quantity: e.target.value })} className={`${small} w-full`} /></label>
            <label className="space-y-1"><span className="text-[11px] text-gray-400">{t('product.offer.price')}</span>
              <input type="number" inputMode="decimal" dir="ltr" value={o.price} onChange={(e) => set(o.id, { price: e.target.value })} className={`${small} w-full`} /></label>
          </div>
          <Toggle checked={!!o.shippingFree} onChange={(c) => set(o.id, { shippingFree: c })}>{t('product.free_shipping')}</Toggle>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...offers, newOffer()])} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400">
        <Plus className="w-4 h-4" />{t('product.offer.add')}
      </button>
    </div>
  );
}

// الإضافات: يختارها الزبون مع المنتج ويُضاف سعرها — إخفاء دون حذف
export function AddonsEditor({ addons, onChange }) {
  const { t } = useTranslation();
  const set = (id, patch) => onChange(addons.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-400">{t('product.addons.hint')}</p>
      {addons.map((a) => (
        <div key={a.id} className={`flex items-center gap-2 ${a.isActive === false ? 'opacity-50' : ''}`}>
          <input value={a.name} onChange={(e) => set(a.id, { name: e.target.value })} placeholder={t('product.addons.name')} className={`${small} flex-1 min-w-0`} />
          <input type="number" inputMode="decimal" min={0} dir="ltr" value={a.price} onChange={(e) => set(a.id, { price: e.target.value })} placeholder={t('product.addons.price')} className={`${small} w-24 shrink-0`} />
          <button type="button" onClick={() => set(a.id, { isActive: a.isActive === false })} title={t(a.isActive === false ? 'product.addons.show' : 'product.addons.hide')} className="p-2 rounded-lg text-gray-400 shrink-0">
            {a.isActive === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={() => onChange(addons.filter((x) => x.id !== a.id))} className="p-2 rounded-lg text-rose-500 shrink-0"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...addons, newAddon()])} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400">
        <Plus className="w-4 h-4" />{t('product.addons.add')}
      </button>
    </div>
  );
}
