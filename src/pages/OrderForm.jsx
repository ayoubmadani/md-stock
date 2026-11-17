// تعديل طلب أو إنشاء طلب يدوي من الهاتف: الزبون، العنوان والتوصيل، المنتجات بنسخها وعروضها
import { groupOfferItems, expandPieces, resizePieces, offerLines } from '../lib/offer-groups';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, Minus, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/orders';
import { attrGroups, editAddon, findVariant, isFreeShipping, itemAddonQty, itemsTotal, missingFields, orderPayload, productAddons, shipPrice } from '../lib/order-form';

const input = 'w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400 disabled:opacity-60';
const label = 'text-xs font-semibold text-gray-500 dark:text-zinc-400';
const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4 space-y-3';

const EMPTY = {
  customerName: '', customerPhone: '', customerEmail: '', customerWhatsapp: '',
  customerWilayaId: null, customerCommuneId: null, priceShip: 0, typeShip: 'home', status: 'pending', isDigital: false, items: [],
};

// قائمة منتجات المتجر للإضافة
function ProductPicker({ storeId, onPick, onClose }) {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    api.get(`/stores/${storeId}/products`).then((r) => setList(r.data?.products || r.data?.data || [])).catch(() => setList([]));
  }, [storeId]);
  const shown = (list || []).filter((p) => p.name?.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 max-h-[85dvh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{t('orders.form.add_product')}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('inventory.search')} className={`${input} ps-9`} />
        </div>
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
          {list === null && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
          {shown.map((p) => (
            <button key={p.id} type="button" onClick={() => onPick(p)} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 text-start">
              <span className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
                {p.imagesProduct?.[0]?.imageUrl && <img src={p.imagesProduct[0].imageUrl} alt="" className="w-full h-full object-cover" />}
              </span>
              <span className="flex-1 min-w-0 text-sm font-semibold truncate"><bdi>{p.name}</bdi></span>
              <span className="text-sm font-bold shrink-0" dir="ltr">{money(p.price)} DA</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// سطر القطعة (مثل لوحة التحكم): ملخص خياراتها وإضافاتها، و«تعديل» يفتح خياراتها وإضافاتها فقط
function PieceRow({ label, variants, cur, onPick, addonsList, pieceAddons, onAddon, isOpen, onToggle, disabled }) {
  const { t } = useTranslation();
  const groups = attrGroups(variants);
  const keyOf = (a) => a.attrName || a.attrId || '';
  const missing = groups.some((g) => !cur.find((a) => keyOf(a) === g.key));
  const colorPart = cur.find((a) => a.displayMode === 'color');
  const text = cur.map((a) => (a.displayMode === 'color' ? (a.label || '') : a.value)).filter(Boolean).join(' · ');
  const added = (pieceAddons || []).filter((a) => !a.separate);
  return (
    <div className="border-t border-gray-100 dark:border-zinc-800">
      <div className="flex items-center gap-2 py-2">
        <span className="w-14 shrink-0 text-[11px] font-bold text-gray-500">{label}</span>
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5 text-sm">
          {missing && <span className="font-bold text-amber-600 dark:text-amber-400">⚠ {t('orders.form.choose_options', 'اختر الخيارات')}</span>}
          {colorPart && <span className="w-3 h-3 rounded-full border border-gray-300 dark:border-zinc-600" style={{ background: colorPart.value }} />}
          {text && <span className="font-semibold">{text}</span>}
          {added.length > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 text-[11px] font-bold">+ {added.map((a) => `${a.name}${Number(a.qty) > 1 ? ` ×${a.qty}` : ''}`).join('، ')}</span>}
        </div>
        {!disabled && (
          <button type="button" onClick={onToggle} aria-expanded={isOpen}
            className={`shrink-0 h-9 px-3 rounded-lg border text-xs font-bold ${isOpen ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-gray-200 dark:border-zinc-700'}`}>
            ✎ {t('orders.form.edit_piece', 'تعديل')}
          </button>
        )}
      </div>
      {isOpen && (
        <div className="mb-3 space-y-3 rounded-xl bg-gray-50 dark:bg-zinc-950 p-3">
          {groups.map((gr) => {
            const sel = cur.find((a) => keyOf(a) === gr.key)?.value;
            return (
              <div key={gr.key} className="space-y-1.5">
                <p className="text-[11px] text-gray-400">{gr.attrName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {gr.options.map((o) => {
                    const on = sel === o.value;
                    const cls = `rounded-lg border text-xs font-semibold ${on ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-gray-200 dark:border-zinc-700'}`;
                    return gr.displayMode === 'color' ? (
                      <button key={o.value} type="button" aria-label={o.value} onClick={() => onPick(gr.key, o.value)} className={`${cls} w-8 h-8`} style={{ backgroundColor: o.value }} />
                    ) : gr.displayMode === 'image' ? (
                      <button key={o.value} type="button" onClick={() => onPick(gr.key, o.value)} className={`${cls} w-10 h-10 overflow-hidden`}><img src={o.value} alt="" className="w-full h-full object-cover" /></button>
                    ) : (
                      <button key={o.value} type="button" onClick={() => onPick(gr.key, o.value)} className={`${cls} px-3 py-1.5 bg-white dark:bg-zinc-900`}>{o.value}</button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {addonsList.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-gray-500">{t('orders.form.addons')}</p>
              {addonsList.map((a) => {
                const found = (pieceAddons || []).find((x) => x.id === a.id);
                const n = found ? Number(found.qty) || 1 : 0;
                const max = Math.max(1, Math.floor(Number(a.maxQty) || 1));
                return (
                  <div key={a.id} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${n ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30' : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'}`}>
                    <button type="button" onClick={() => onAddon(a, n ? 0 : 1)} className="flex-1 min-w-0 flex items-center gap-2 text-start text-sm">
                      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 text-[11px] ${n ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 dark:border-zinc-600'}`}>{n ? '✓' : ''}</span>
                      <span className="truncate font-semibold">{a.name}</span>
                      <span className="text-xs text-gray-400 shrink-0" dir="ltr">+{money(Number(a.price) || 0)} DA</span>
                    </button>
                    {n > 0 && max > 1 && (
                      <div className="flex items-center gap-1 shrink-0" dir="ltr">
                        <button type="button" onClick={() => onAddon(a, n - 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="w-6 text-center text-sm font-bold">{n}</span>
                        <button type="button" disabled={n >= max} onClick={() => onAddon(a, n + 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center disabled:opacity-40"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <button type="button" onClick={onToggle} className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-xs font-bold">{t('orders.form.done', 'تم')}</button>
        </div>
      )}
    </div>
  );
}

const perPieceAddons = (addons) => (addons || []).reduce((s, a) => s + (a.separate ? 0 : Number(a.price || 0) * Number(a.qty || 1)), 0);
const withAddon = (addons, a, qty) => {
  const max = Math.max(1, Math.floor(Number(a.maxQty) || 1));
  const q = Math.max(0, Math.min(max, qty));
  const rest = (addons || []).filter((x) => !x.separate && x.id !== a.id);
  const next = q > 0 ? [...rest, { id: a.id, name: a.name, price: Number(a.price) || 0, ...(q > 1 ? { qty: q } : {}) }] : rest;
  return next.length ? next : null;
};

// رأس البطاقة (مثل لوحة التحكم): الصورة، الاسم، السعر (وشارة العرض)، زر الحذف
function CardHead({ product, price, offerSelect, onRemove, disabled }) {
  return (
    <div className="flex items-center gap-3 pb-2">
      <span className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
        {product?.imagesProduct?.[0]?.imageUrl && <img src={product.imagesProduct[0].imageUrl} alt="" className="w-full h-full object-cover" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate"><bdi>{product?.name}</bdi></p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400" dir="ltr">{money(price)} DA</span>
          {offerSelect}
        </div>
      </div>
      {!disabled && <button type="button" onClick={onRemove} className="p-2 rounded-lg text-rose-500"><Trash2 className="w-4 h-4" /></button>}
    </div>
  );
}

// بطاقات العرض: كل عرض بطاقة مستقلة، وتحتها سطر لكل قطعة. لإضافة عرض: «إضافة منتج»
function OfferCards({ g, options, disabled, onReplace, canRemove }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState('');
  const variants = options?.variants || [];
  const offers = (options?.offers || []).filter((o) => o.isActive !== false);
  const per = Math.max(1, Number(g.offer.quantity) || 1);
  const pieces = expandPieces(g.items);
  const count = Math.max(1, Math.ceil(pieces.length / per));
  const addonsList = productAddons(g.product);
  const removeUnit = (b) => {
    if (!canRemove(per)) return toast.error(t('orders.form.last_item'));
    onReplace(offerLines([...pieces.slice(0, b * per), ...pieces.slice(b * per + per)], g.offer));
  };
  const setUnitOffer = (b, id) => {
    const seen = new Set();
    const before = offerLines(pieces.slice(0, b * per), g.offer, seen);
    const after = offerLines(pieces.slice(b * per + per), g.offer, seen);
    const unit = pieces.slice(b * per, b * per + per);
    const o = offers.find((x) => String(x.id) === String(id));
    const mid = o
      ? offerLines(resizePieces(unit, 1, Number(o.quantity) || 1), o, seen)
      : unit.slice(0, 1).map((p) => {
        const price = Number(p.variantDetail?.price) > -1 && p.variantDetail?.price != null ? Number(p.variantDetail.price) : Number(p.product?.price || 0);
        return { ...p, id: `new-${Date.now()}-n${b}`, offerId: null, offer: null, noOffer: true, quantity: 1, finalPrice: price + perPieceAddons(p.addons) };
      });
    onReplace([...before, ...mid, ...after]);
  };
  const setAttr = (k, key, value) => {
    const cur = Array.isArray(pieces[k].variantDetail?.name) ? pieces[k].variantDetail.name : [];
    const v = findVariant(variants, cur, key, value);
    if (!v) return toast.error(t('orders.form.unavailable'));
    onReplace(offerLines(pieces.map((p, x) => (x === k ? { ...p, variantDetailId: v.id, variantDetail: v } : p)), g.offer));
  };
  const setAddon = (k, a, qty) => onReplace(offerLines(pieces.map((p, x) => (x === k ? { ...p, addons: withAddon(p.addons, a, qty) } : p)), g.offer));
  return (
    <>
      {Array.from({ length: count }, (_, b) => (
        <div key={b} className="rounded-xl border border-gray-100 dark:border-zinc-800 px-3 pt-3 pb-1 mb-3">
          <CardHead product={g.product} price={g.offer.price} disabled={disabled} onRemove={() => removeUnit(b)}
            offerSelect={(
              <span className="relative inline-flex items-center">
                <select value={g.offer.id} disabled={disabled} onChange={(e) => setUnitOffer(b, e.target.value)}
                  className="appearance-none rounded-full border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/20 ps-2.5 pe-6 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 outline-none">
                  <option value="">{t('orders.form.no_offer')}</option>
                  {offers.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
                <span aria-hidden="true" className="pointer-events-none absolute end-2 text-[9px] text-amber-600">▾</span>
              </span>
            )} />
          {pieces.slice(b * per, b * per + per).map((p, i) => {
            const k = b * per + i;
            const key = `${b}-${i}`;
            return (
              <PieceRow key={k} label={per > 1 ? `${t('orders.form.piece', 'القطعة')} ${i + 1}` : t('orders.form.options', 'الخيارات')}
                variants={variants} cur={Array.isArray(p.variantDetail?.name) ? p.variantDetail.name : []}
                onPick={(gk, v) => setAttr(k, gk, v)} addonsList={addonsList} pieceAddons={p.addons} onAddon={(a, q) => setAddon(k, a, q)}
                isOpen={open === key} onToggle={() => setOpen(open === key ? '' : key)} disabled={disabled} />
            );
          })}
        </div>
      ))}
    </>
  );
}

// منتج بدون عرض وله خيارات: نفس البطاقة، سطر للقطعة، و«+ قطعة أخرى من نفس المنتج»
function PlainCard({ item, options, disabled, onChange, onRemove, onAddPiece }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const variants = options?.variants || [];
  const cur = Array.isArray(item.variantDetail?.name) ? item.variantDetail.name : [];
  const baseOf = (v) => (Number(v?.price) > -1 && v?.price != null ? Number(v.price) : Number(item.product?.price || 0));
  const onPick = (key, value) => {
    const v = findVariant(variants, cur, key, value);
    if (!v) return toast.error(t('orders.form.unavailable'));
    onChange({ variantDetailId: v.id, variantDetail: v, finalPrice: baseOf(v) + perPieceAddons(item.addons) });
  };
  const onAddon = (a, qty) => {
    const addons = withAddon(item.addons, a, qty);
    onChange({ addons, addonQty: undefined, finalPrice: baseOf(item.variantDetail) + perPieceAddons(addons) });
  };
  return (
    <div className="rounded-xl border border-gray-100 dark:border-zinc-800 px-3 pt-3 pb-1 mb-3">
      <CardHead product={item.product} price={item.finalPrice} disabled={disabled} onRemove={onRemove} />
      <PieceRow label={t('orders.form.options', 'الخيارات')} variants={variants} cur={cur} onPick={onPick}
        addonsList={productAddons(item.product)} pieceAddons={item.addons} onAddon={onAddon}
        isOpen={open} onToggle={() => setOpen(!open)} disabled={disabled} />
      {!disabled && (
        <div className="border-t border-gray-100 dark:border-zinc-800 py-1">
          <button type="button" onClick={onAddPiece} className="h-9 px-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">+ {t('orders.form.add_piece', 'قطعة أخرى من نفس المنتج')}</button>
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, options, disabled, onChange, onRemove }) {
  const { t } = useTranslation();
  const variants = options?.variants || [];
  const offers = (options?.offers || []).filter((o) => o.isActive !== false);
  const groups = attrGroups(variants);
  const current = Array.isArray(item.variantDetail?.name) ? item.variantDetail.name : [];
  const selected = (key) => current.find((a) => (a.attrName || a.attrId || '') === key)?.value;

  const pickAttr = (key, value) => {
    const v = findVariant(variants, current, key, value);
    if (!v) return toast.error(t('orders.form.unavailable'));
    const price = Number(v.price) > -1 && v.price != null ? Number(v.price) : Number(item.product?.price || 0);
    onChange({ variantDetailId: v.id, variantDetail: v, ...(item.offerId ? {} : { finalPrice: price }) });
  };

  const pickOffer = (id) => {
    const o = offers.find((x) => String(x.id) === String(id));
    if (o) return onChange({ offerId: o.id, offer: o, finalPrice: Number(o.price) });
    const base = Number(item.variantDetail?.price) > -1 && item.variantDetail?.price != null ? Number(item.variantDetail.price) : Number(item.product?.price || 0);
    onChange({ offerId: null, offer: null, finalPrice: base });
  };

  return (
    <div className="rounded-xl border border-gray-100 dark:border-zinc-800 p-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
          {item.product?.imagesProduct?.[0]?.imageUrl && <img src={item.product.imagesProduct[0].imageUrl} alt="" className="w-full h-full object-cover" />}
        </span>
        <p className="flex-1 min-w-0 text-sm font-semibold truncate"><bdi>{item.product?.name}</bdi></p>
        {!disabled && <button type="button" onClick={onRemove} className="p-2 rounded-lg text-rose-500"><Trash2 className="w-4 h-4" /></button>}
      </div>

      {groups.map((g) => (
        <div key={g.key} className="space-y-1.5">
          <p className="text-[11px] text-gray-400">{g.attrName}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.options.map((o) => {
              const on = selected(g.key) === o.value;
              const cls = `rounded-lg border text-xs font-semibold ${on ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-gray-200 dark:border-zinc-700'} disabled:opacity-50`;
              return g.displayMode === 'color' ? (
                <button key={o.value} type="button" disabled={disabled} onClick={() => pickAttr(g.key, o.value)} className={`${cls} w-8 h-8`} style={{ backgroundColor: o.value }} />
              ) : g.displayMode === 'image' ? (
                <button key={o.value} type="button" disabled={disabled} onClick={() => pickAttr(g.key, o.value)} className={`${cls} w-10 h-10 overflow-hidden`}><img src={o.value} alt="" className="w-full h-full object-cover" /></button>
              ) : (
                <button key={o.value} type="button" disabled={disabled} onClick={() => pickAttr(g.key, o.value)} className={`${cls} px-3 py-1.5`}>{o.value}</button>
              );
            })}
          </div>
        </div>
      ))}

      {/* الإضافات: التاجر يضيفها أو يحذفها ويغيّر كميتها (منفصلة عن كمية المنتج، سعرها من المنتج) */}
      {productAddons(item.product).length > 0 && (() => {
        const q = itemAddonQty(item);
        const set = (id, n) => onChange(editAddon(item, id, n));
        return (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-500">{t('orders.form.addons')}</p>
            {productAddons(item.product).map((a) => {
              const n = q[a.id] || 0;
              return (
                <div key={a.id} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${n ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30' : 'border-gray-200 dark:border-zinc-800'}`}>
                  <button type="button" disabled={disabled} onClick={() => set(a.id, n ? 0 : 1)} className="flex-1 min-w-0 flex items-center gap-2 text-start text-sm">
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 text-[11px] ${n ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 dark:border-zinc-600'}`}>{n ? '✓' : ''}</span>
                    <span className="truncate font-semibold">{a.name}</span>
                    <span className="text-xs text-gray-400 shrink-0" dir="ltr">+{money(Number(a.price) || 0)} DA</span>
                  </button>
                  {n > 0 && (
                    <div className="flex items-center gap-1 shrink-0" dir="ltr">
                      <button type="button" disabled={disabled} onClick={() => set(a.id, n - 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-6 text-center text-sm font-bold">{n}</span>
                      <button type="button" disabled={disabled || n >= 99} onClick={() => set(a.id, n + 1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center disabled:opacity-40"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {offers.length > 0 && (
        <select value={item.offerId || ''} disabled={disabled} onChange={(e) => pickOffer(e.target.value)} className={`${input} py-2.5 text-sm`}>
          <option value="">{t('orders.form.no_offer')}</option>
          {offers.map((o) => <option key={o.id} value={o.id}>{o.name} — {money(o.price)} DA</option>)}
        </select>
      )}

      <div className="flex items-center gap-2">
        <button type="button" disabled={disabled || item.quantity <= 1} onClick={() => onChange({ quantity: item.quantity - 1 })} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center disabled:opacity-40"><Minus className="w-4 h-4" /></button>
        <span className="w-8 text-center font-bold" dir="ltr">{item.quantity}</span>
        <button type="button" disabled={disabled} onClick={() => onChange({ quantity: item.quantity + 1 })} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40"><Plus className="w-4 h-4" /></button>
        <span className="flex-1" />
        <input type="number" inputMode="decimal" min={0} dir="ltr" disabled={disabled} value={item.finalPrice}
          onChange={(e) => onChange({ finalPrice: e.target.value === '' ? '' : Number(e.target.value) })}
          className="w-28 px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-400" />
        <span className="text-xs text-gray-400">DA</span>
      </div>
    </div>
  );
}

// صفحة (/orders/new، /orders/:id/edit) أو داخل مودل (orderId + onDone + onClose): مثلاً طلب ممسوح أثناء البيع في المحل
export default function OrderForm({ orderId, onDone, onClose } = {}) {
  const { t } = useTranslation();
  const params = useParams();
  const embedded = !!orderId;
  const id = orderId ?? params.id;
  const isNew = !id;
  const navigate = useNavigate();
  const { storeId, store } = useAuth();
  const location = useLocation();
  // من «الطلبات المتروكة»: الاسم والهاتف والمنتج كما كتبها الزبون
  const draft = isNew ? location.state?.draft : null;
  const [form, setForm] = useState(isNew ? { ...EMPTY, customerName: draft?.name || '', customerPhone: draft?.phone || '' } : null);
  const [orderStore, setOrderStore] = useState(null);
  const [wilayas, setWilayas] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [options, setOptions] = useState({}); // productId → { variants, offers }
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadOptions = async (productIds) => {
    const missing = [...new Set(productIds)].filter((pid) => pid && !options[pid]);
    if (!missing.length) return;
    const entries = await Promise.all(missing.map(async (pid) => {
      const [v, o] = await Promise.all([
        api.get(`/products/${pid}/variants`).then((r) => r.data || []).catch(() => []),
        api.get(`/products/${pid}/offers`).then((r) => r.data || []).catch(() => []),
      ]);
      return [pid, { variants: v, offers: o }];
    }));
    setOptions((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  };

  const loadCommunes = (wilayaId) => {
    if (!wilayaId) return setCommunes([]);
    api.get(`/shipping/get-communes/${wilayaId}`, { params: { storeId } }).then((r) => setCommunes(r.data || [])).catch(() => setCommunes([]));
  };

  // أسعار التوصيل في حساب الشحن الذي يستعمله هذا المتجر
  useEffect(() => {
    const req = store?.ownerId
      ? api.get(`/shipping/public/get-shipping/${store.ownerId}`, { params: { storeId } })
      : api.get('/shipping/get-shipping');
    req.then((r) => setWilayas(r.data || [])).catch(() => setWilayas([]));
  }, [store?.ownerId, storeId]);

  useEffect(() => {
    if (isNew) return;
    api.get(`/orders/get-one/${id}`).then(({ data }) => {
      // بيع في المحل: يُعدَّل في صفحة البيع
      if (data?.platform === 'pos') return navigate(`/pos/${id}`, { replace: true });
      setOrderStore(data.store || null);
      setForm({
        ...data,
        customerWilayaId: data.customerWilayaId ?? data.customerWilaya?.id ?? null,
        customerCommuneId: data.customerCommuneId ?? data.customerCommune?.id ?? null,
        priceShip: Number(data.priceShip || 0),
        typeShip: data.typeShip || 'home',
        items: (data.items || []).map((it) => ({ ...it, productId: it.productId || it.product?.id, finalPrice: Number(it.finalPrice ?? it.product?.price ?? 0) })),
      });
      loadCommunes(data.customerWilayaId ?? data.customerWilaya?.id);
      loadOptions((data.items || []).map((it) => it.productId || it.product?.id));
    }).catch(() => { toast.error(t('orders.load_failed')); if (embedded) onClose(); else navigate('/orders'); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  useEffect(() => {
    if (!draft?.productId) return;
    api.get(`/stores/${storeId}/products/${draft.productId}`).then(({ data }) => {
      const p = data?.data || data;
      if (!p?.id) return;
      setForm((f) => (f.items.length ? f : { ...f, isDigital: !!p.isDigital, items: [{ id: `new-${Date.now()}`, productId: p.id, product: p, quantity: 1, finalPrice: Number(p.price || 0), variantDetailId: null, offerId: null }] }));
      loadOptions([p.id]);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // منتج جديد في الطلب وله عروض: يبدأ كبطاقة عرض بأول عرض (إلا إن اختار التاجر «بدون عرض»)
  useEffect(() => {
    if (!form?.items?.length) return;
    const pending = form.items.filter((it) => String(it.id).startsWith('new-') && !it.offerId && !it.noOffer && (options[it.productId]?.offers || []).some((o) => o.isActive !== false));
    if (!pending.length) return;
    setForm((f) => ({ ...f, items: f.items.flatMap((it) => {
      if (!pending.some((x) => x.id === it.id)) return [it];
      const o = options[it.productId].offers.find((x) => x.isActive !== false);
      return offerLines(resizePieces(expandPieces([it]), 1, Number(o.quantity) || 1), o);
    }) }));
  }, [form?.items, options]);
  const free = useMemo(() => (form ? isFreeShipping(form, orderStore || store) : false), [form, orderStore, store]);
  if (!form) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  // عند شركة التأكيد: لا تعديل (كما في اللوحة)
  const locked = !isNew && !!form.confirmationCompanyId;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const wilaya = wilayas.find((w) => Number(w.id) === Number(form.customerWilayaId));

  const pickWilaya = (wid) => {
    const w = wilayas.find((x) => Number(x.id) === Number(wid));
    // نوع التوصيل غير المتاح في هذه الولاية ← الآخر
    const typeShip = w && form.typeShip === 'home' && w.homeEnabled === false ? 'office' : w && form.typeShip === 'office' && w.officeEnabled === false ? 'home' : form.typeShip;
    set({ customerWilayaId: wid ? Number(wid) : null, customerCommuneId: null, typeShip, priceShip: shipPrice(w, typeShip) });
    loadCommunes(wid);
  };
  const pickType = (typeShip) => set({ typeShip, priceShip: wilaya ? shipPrice(wilaya, typeShip) : form.priceShip });

  const addProduct = (p) => {
    setPicker(false);
    const price = Number(p.price || 0);
    setForm((f) => ({
      ...f,
      isDigital: isNew && !f.items.length ? !!p.isDigital : f.isDigital,
      items: [...f.items, { id: `new-${Date.now()}`, productId: p.id, product: p, quantity: 1, finalPrice: price, variantDetailId: null, offerId: null }],
    }));
    loadOptions([p.id]);
  };
  const replaceGroup = (g, lines) => setForm((f) => {
    const ids = new Set(g.items.map((it) => it.id));
    const at = f.items.findIndex((it) => ids.has(it.id));
    const rest = f.items.filter((it) => !ids.has(it.id));
    rest.splice(at < 0 ? rest.length : at, 0, ...lines);
    return { ...f, items: rest };
  });
  const changeItem = (itemId, patch) => setForm((f) => ({ ...f, items: f.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }));
  const removeItem = (itemId) => {
    if (!isNew && form.items.length <= 1) return toast.error(t('orders.form.last_item'));
    setForm((f) => ({ ...f, items: f.items.filter((it) => it.id !== itemId) }));
  };

  const save = async (e) => {
    e.preventDefault();
    const missing = missingFields(form);
    if (missing.length) return toast.error(`${t('orders.form.missing')}: ${missing.map((m) => t(`orders.form.f_${m}`)).join('، ')}`);
    // نسخة لم تُختر لمنتج له نسخ
    if (form.items.some((it) => (options[it.productId]?.variants || []).length > 0 && !it.variantDetailId)) return toast.error(t('orders.form.pick_variant'));
    setSaving(true);
    try {
      if (isNew) {
        const { data } = await api.post('/orders', orderPayload(form, { free, storeId }));
        const newId = (data?.data || data)?.id;
        toast.success(t('orders.form.created'));
        navigate(newId ? `/orders/${newId}` : '/orders', { replace: true });
      } else {
        await api.patch(`/orders/${form.id}`, orderPayload(form, { free }));
        toast.success(t('inventory.saved'));
        if (embedded) onDone(); else navigate(`/orders/${form.id}`, { replace: true });
      }
    } catch (err) {
      toast.error(errorMessage(err, t('orders.save_failed')));
    } finally {
      setSaving(false);
    }
  };

  const subtotal = itemsTotal(form.items);
  const ship = form.isDigital || free ? 0 : Number(form.priceShip || 0);

  return (
    <form onSubmit={save} className="max-w-xl mx-auto space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => (embedded ? onClose() : navigate(-1))} className="flex items-center gap-1 text-sm text-gray-500"><ArrowRight className="w-4 h-4 ltr:rotate-180" />{t('product.back')}</button>
        <h1 className="font-bold">{isNew ? t('orders.form.new') : t('orders.form.edit')}</h1>
        <span className="w-8" />
      </div>

      {locked && <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3">{t('orders.locked', { name: form.confirmationCompany?.name || '' })}</p>}

      {/* الزبون */}
      <fieldset disabled={locked} className={box}>
        <div className="space-y-1.5"><label className={label}>{t('orders.form.f_name')}</label><input value={form.customerName || ''} onChange={(e) => set({ customerName: e.target.value })} className={input} /></div>
        <div className="space-y-1.5"><label className={label}>{t('orders.form.f_phone')}</label><input type="tel" dir="ltr" value={form.customerPhone || ''} onChange={(e) => set({ customerPhone: e.target.value })} className={input} /></div>
        {form.isDigital && (
          <>
            <div className="space-y-1.5"><label className={label}>Email</label><input type="email" dir="ltr" value={form.customerEmail || ''} onChange={(e) => set({ customerEmail: e.target.value })} className={input} /></div>
            <div className="space-y-1.5"><label className={label}>WhatsApp</label><input type="tel" dir="ltr" value={form.customerWhatsapp || ''} onChange={(e) => set({ customerWhatsapp: e.target.value })} className={input} /></div>
          </>
        )}
      </fieldset>

      {/* العنوان والتوصيل */}
      {!form.isDigital && (
        <fieldset disabled={locked} className={box}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={label}>{t('orders.form.f_wilaya')}</label>
              <select value={form.customerWilayaId || ''} onChange={(e) => pickWilaya(e.target.value)} className={input}>
                <option value="">—</option>
                {wilayas.map((w) => <option key={w.id} value={w.id}>{w.code ?? w.id} - {w.ar_name || w.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={label}>{t('orders.form.f_commune')}</label>
              <select value={form.customerCommuneId || ''} onChange={(e) => set({ customerCommuneId: e.target.value ? Number(e.target.value) : null })} className={input}>
                <option value="">—</option>
                {communes.map((c) => <option key={c.id} value={c.id}>{c.ar_name || c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800">
            {['home', 'office'].map((k) => {
              const off = wilaya && wilaya[k === 'home' ? 'homeEnabled' : 'officeEnabled'] === false;
              return (
                <button key={k} type="button" disabled={off} onClick={() => pickType(k)}
                  className={`py-2 rounded-lg text-sm font-bold disabled:opacity-40 ${form.typeShip === k ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'text-gray-500'}`}>
                  <span className="block">{t(`orders.ship_${k}`)}</span>{wilaya && <span className="block opacity-60 text-xs" dir="ltr">{money(shipPrice(wilaya, k))} DA</span>}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <label className={`${label} flex-1`}>{t('orders.shipping_fee')}</label>
            <input type="number" inputMode="decimal" min={0} dir="ltr" value={form.priceShip} onChange={(e) => set({ priceShip: e.target.value === '' ? '' : Number(e.target.value) })}
              className="w-28 px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-400" />
            <span className="text-xs text-gray-400">DA</span>
          </div>
          {free && <p className="text-xs text-emerald-600">{t('orders.form.free_shipping')}</p>}
        </fieldset>
      )}

      {/* المنتجات */}
      <div className={box}>
        {/* بطاقات العرض: كل عرض مستقل، الكمية = عدد العروض */}
        {groupOfferItems(form.items).map((g) => g.type === 'item'
          ? ((options[g.item.productId]?.variants || []).length > 0 && !g.item.offerId
            ? <PlainCard key={g.item.id} item={g.item} options={options[g.item.productId]} disabled={locked}
                onChange={(patch) => changeItem(g.item.id, patch)} onRemove={() => removeItem(g.item.id)}
                onAddPiece={() => setForm((f) => { const at = f.items.findIndex((x) => x.id === g.item.id); const items = [...f.items]; items.splice(at + 1, 0, { ...g.item, id: `new-${Date.now()}`, quantity: 1, noOffer: true }); return { ...f, items }; })} />
            : <ItemCard key={g.item.id} item={g.item} options={options[g.item.productId]} disabled={locked}
                onChange={(patch) => changeItem(g.item.id, patch)} onRemove={() => removeItem(g.item.id)} />)
          : <OfferCards key={g.key} g={g} options={options[g.items[0].productId]} disabled={locked} onReplace={(lines) => replaceGroup(g, lines)} canRemove={(n) => isNew || form.items.length - n > 0} />)}
        {!locked && (
          <button type="button" onClick={() => setPicker(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400">
            <Plus className="w-4 h-4" />{t('orders.form.add_product')}
          </button>
        )}
        <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">{t('orders.subtotal')}</span><b dir="ltr">{money(subtotal)} DA</b></div>
          {!form.isDigital && <div className="flex justify-between"><span className="text-gray-500">{t('orders.shipping_fee')}</span><b dir="ltr">{money(ship)} DA</b></div>}
          <div className="flex justify-between"><span className="text-gray-500">{t('orders.total')}</span><b dir="ltr" className="text-lg text-emerald-600 dark:text-emerald-400">{money(subtotal + ship)} DA</b></div>
        </div>
      </div>

      {!locked && (
        <div className="pt-2">
          <button disabled={saving} className="w-full max-w-xl mx-auto flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{isNew ? t('orders.form.create') : t('inventory.save')}
          </button>
        </div>
      )}

      {picker && <ProductPicker storeId={storeId} onPick={addProduct} onClose={() => setPicker(false)} />}
    </form>
  );
}
