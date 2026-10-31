// بيع في المحل: مسح المنتجات (كاميرا أو قارئ باركود)، تعديل الكمية والسعر، زبون اختياري،
// ثم «تأكيد البيع» ← طلب «مسلّم» (يُخصم المخزون) وإيصال بباركود الطلب
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import JsBarcode from 'jsbarcode';
import { Check, ChevronDown, Clock, ListPlus, Loader2, Receipt as ReceiptIcon, Minus, Package, PackagePlus, Pencil, Plus, Printer, Search, ShoppingBag, Trash2, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { posProducts } from '../lib/bulk-select';
import { money, paymentState } from '../lib/orders';
import { addScanned, addService, cartTotal, findPickable, orderToCart, pickedHit, saleBody, setLine } from '../lib/pos';
import Scanner from '../components/Scanner';
import QuickProductSheet from '../components/QuickProductSheet';
import { CustomerAvatar, CustomerPickerSheet } from '../components/customers';
import { input } from '../components/product';
import { VariantParts } from '../components/inventory';

const NO_CUSTOMER = { name: '', phone: '' };
const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80';

// صفارة قصيرة عند كل مسح ناجح
function beep(ok = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = ok ? 1200 : 300; g.gain.value = 0.08;
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + (ok ? 0.08 : 0.25));
  } catch { /* بلا صوت */ }
  navigator.vibrate?.(ok ? 40 : [80, 60, 80]);
}

function OrderBarcode({ value }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && value) JsBarcode(ref.current, value, { format: 'CODE128', height: 56, width: 2, displayValue: true, fontSize: 16, margin: 4, background: '#ffffff' }); }, [value]);
  return <svg ref={ref} className="mx-auto max-w-full" />;
}

// الإيصال بعد البيع
function Receipt({ order, store, onNext }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="max-w-sm mx-auto space-y-3">
      <div id="pos-receipt" className="rounded-2xl bg-white text-gray-900 p-5 space-y-3 shadow-sm">
        <div className="text-center space-y-0.5">
          <p className="font-black text-lg"><bdi>{store?.name}</bdi></p>
          <p className="text-xs text-gray-500">{new Date(order.createdAt || Date.now()).toLocaleString(i18n.language)}</p>
        </div>
        <div className="border-t border-dashed border-gray-300" />
        {(order.items || []).map((it) => (
          <div key={it.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0"><bdi>{it.product?.name || it.title || '—'}</bdi> <span className="text-gray-500" dir="ltr">×{it.quantity}</span></span>
            <span className="font-bold shrink-0" dir="ltr">{money(it.finalPrice * it.quantity)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-300" />
        <div className="flex items-center justify-between font-black text-lg"><span>{t('pos.total')}</span><span dir="ltr">{money(order.totalPrice)} DA</span></div>
        {order.status === 'unpaid' && (
          <div className="space-y-0.5 text-sm">
            <div className="flex items-center justify-between"><span>{t('pos.paid')}</span><span dir="ltr">{money(paymentState(order).paid)} DA</span></div>
            <div className="flex items-center justify-between font-black"><span>{t('pos.remaining')}</span><span dir="ltr">{money(paymentState(order).remaining)} DA</span></div>
            <p className="text-center text-xs font-bold border border-gray-900 rounded-md py-1 mt-1">{t('pos.unpaid_stamp')}</p>
          </div>
        )}
        {order.customerPhone && <p className="text-xs text-gray-500 text-center" dir="ltr">{order.customerName} · {order.customerPhone}</p>}
        {order.barcode && <OrderBarcode value={order.barcode} />}
        <p className="text-center text-xs text-gray-500">{t('pos.thanks')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 font-bold text-sm"><Printer className="w-4 h-4" />{t('pos.print')}</button>
        <Link to={`/orders/${order.id}`} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 font-bold text-sm">{t('pos.open_order')}</Link>
      </div>
      <button type="button" onClick={onNext} className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold print:hidden">{t('pos.next_sale')}</button>
    </div>
  );
}

// اختيار منتج من القائمة (بلا باركود): لمسة على السطر = +1 في السلة، زر «−» في طرفه = −1؛ المنتج بنسخ يُفتح لاختيار النسخة
function PickSheet({ storeId, cart, onPick, onRemove, onClose }) {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => {
    api.get(`/stores/${storeId}/inventory`).then(({ data }) => setList(posProducts(data?.products || []))).catch((e) => { setList([]); toast.error(errorMessage(e, t('inventory.error'))); });
  }, [storeId, t]);
  const inCart = (key) => cart.find((l) => l.key === key)?.quantity || 0;
  const qty = (n) => n > 0 && <span className="min-w-6 h-6 px-1.5 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0" dir="ltr">{n}</span>;
  // العدد في السلة + زر الإنقاص (خارج زر الإضافة)
  const minus = (key) => {
    const n = inCart(key);
    return n > 0 && (
      <span className="flex items-center gap-1.5 shrink-0">
        {qty(n)}
        <button type="button" onClick={() => onRemove(key)} aria-label="-1" className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">{n === 1 ? <Trash2 className="w-4 h-4 text-rose-500" /> : <Minus className="w-4 h-4" />}</button>
      </span>
    );
  };
  const stock = (n) => <span className={`text-[11px] ${n > 0 ? 'text-gray-400' : 'text-rose-500'}`}>{t('pos.in_stock', { count: n })}</span>;
  const shown = findPickable(list || [], q);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 h-[85dvh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{t('pos.pick_title')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('pos.pick_search')} type="search" className={`${input} ps-9`} />
        </div>
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
          {list === null && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
          {list && !shown.length && <p className="text-center text-sm text-gray-400 py-8">{t('pos.pick_none')}</p>}
          {shown.map((p) => {
            const hasVariants = p.variants?.length > 0;
            const expanded = hasVariants && (open === p.id || q.trim());
            const n = hasVariants ? cart.filter((l) => l.productId === p.id).reduce((s, l) => s + l.quantity, 0) : inCart(p.id);
            return (
              <div key={p.id} className="rounded-xl">
                <div className="flex items-center gap-2">
                <button type="button" onClick={() => (hasVariants ? setOpen(open === p.id ? null : p.id) : onPick(pickedHit(p)))} className="flex-1 min-w-0 flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 dark:active:bg-zinc-800 text-start">
                  <span className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">{p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate"><bdi>{p.name}</bdi></span>
                    {hasVariants ? <span className="text-[11px] text-gray-400">{t('pos.variants', { count: p.variants.length })}</span> : stock(p.stock)}
                  </span>
                  {hasVariants && qty(n)}
                  {hasVariants ? <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} /> : <span className="text-sm font-bold shrink-0" dir="ltr">{money(p.price)} DA</span>}
                </button>
                {!hasVariants && minus(p.id)}
                </div>
                {expanded && (
                  <div className="ms-14 mb-1 space-y-1">
                    {p.variants.map((v) => (
                      <div key={v.id} className="flex items-center gap-2">
                        <button type="button" onClick={() => onPick(pickedHit(p, v))} className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-zinc-950 active:bg-gray-100 dark:active:bg-zinc-800 text-start">
                          <span className="flex-1 min-w-0">{v.parts?.length ? <VariantParts parts={v.parts} className="text-sm" /> : <span className="block text-sm truncate"><bdi>{v.label || '—'}</bdi></span>}<span className="block">{stock(v.stock)}</span></span>
                          <span className="text-sm font-bold shrink-0" dir="ltr">{money(v.price)} DA</span>
                        </button>
                        {minus(`${p.id}:${v.id}`)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={onClose} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold">{t('pos.pick_done')}</button>
      </div>
    </div>
  );
}

// خدمة بلا منتج (فاتورة ماء، شحن رصيد…): وصف + المبلغ الذي يدفعه الزبون + التكلفة (ما تدفعه أنت) — الربح = الفرق
function ServiceSheet({ onAdd, onClose }) {
  const { t } = useTranslation();
  const [f, setF] = useState({ title: '', price: '', cost: '' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const price = Number(f.price || 0);
  const cost = f.cost === '' ? null : Number(f.cost);
  const ok = f.title.trim() && f.price !== '' && price >= 0 && (cost == null || cost >= 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onAdd(f); }} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold flex items-center gap-2"><ReceiptIcon className="w-5 h-5 text-indigo-500" />{t('pos.service_title')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-500">{t('pos.service_hint')}</p>
        <input value={f.title} onChange={set('title')} placeholder={t('pos.service_name')} maxLength={200} className={input} autoFocus />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><label className="text-xs font-semibold text-gray-500">{t('pos.service_price')}</label>
            <input value={f.price} onChange={set('price')} type="number" inputMode="decimal" dir="ltr" min="0" placeholder="0" className={input} /></div>
          <div className="space-y-1"><label className="text-xs font-semibold text-gray-500">{t('pos.service_cost_opt')}</label>
            <input value={f.cost} onChange={set('cost')} type="number" inputMode="decimal" dir="ltr" min="0" placeholder="0" className={input} /></div>
        </div>
        {cost != null && f.price !== '' && (
          <div className="flex justify-between rounded-xl bg-gray-50 dark:bg-zinc-950 p-3 text-sm">
            <span className="text-gray-500">{t('pos.service_profit')}</span>
            <bdi dir="ltr" className={`font-black ${price - cost < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{money(price - cost)} DA</bdi>
          </div>
        )}
        <button disabled={!ok} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50"><Plus className="w-5 h-5" />{t('pos.service_add')}</button>
      </form>
    </div>
  );
}

// الزبون في صفحة البيع: بطاقة الزبون المختار (لمسة = تغيير، ✕ = بلا زبون) أو زر «اختيار زبون»
function CustomerBox({ customer, onPick, onClear, required }) {
  const { t } = useTranslation();
  if (!customer.name) {
    return (
      <button type="button" onClick={onPick} className={`w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed text-sm font-bold ${required ? 'border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400' : 'border-gray-300 dark:border-zinc-700 text-gray-500'}`}>
        <User className="w-4 h-4" />{t(required ? 'pos.pick_customer_required' : 'pos.add_customer')}
      </button>
    );
  }
  return (
    <div className={`${box} p-2.5 flex items-center gap-3`}>
      <button type="button" onClick={onPick} className="flex-1 min-w-0 flex items-center gap-3 text-start">
        <CustomerAvatar c={customer} />
        <span className="min-w-0">
          <span className="block text-sm font-bold truncate"><bdi>{customer.name}</bdi></span>
          <span className="block text-xs text-gray-500" dir="ltr" style={{ textAlign: 'start' }}>{customer.phone}</span>
        </span>
      </button>
      <button type="button" onClick={onClear} className="p-2 rounded-lg text-gray-400"><X className="w-4 h-4" /></button>
    </div>
  );
}

// دفع لاحقاً: اسم الزبون وهاتفه إجباريان، وعربون اختياري (دفع جزئي)
function PayLaterSheet({ total, customer, onPickCustomer, onClearCustomer, saving, onConfirm, onClose }) {
  const { t } = useTranslation();
  const [paidNow, setPaidNow] = useState('');
  const paid = Number(paidNow || 0);
  const tooMuch = paid > total;
  const ok = customer.name && customer.phone && !tooMuch && !saving;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={(e) => { e.preventDefault(); if (ok) onConfirm(paid); }} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" />{t('pos.pay_later')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-500">{t('pos.pay_later_hint')}</p>
        <CustomerBox customer={customer} onPick={onPickCustomer} onClear={onClearCustomer} required />
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-500">{t('pos.paid_now')}</label>
          <input value={paidNow} onChange={(e) => setPaidNow(e.target.value)} type="number" inputMode="decimal" dir="ltr" min="0" placeholder="0" className={`${input} ${tooMuch ? 'border-rose-400' : ''}`} />
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-zinc-950 p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">{t('pos.total')}</span><span className="font-bold" dir="ltr">{money(total)} DA</span></div>
          <div className="flex justify-between"><span className="text-gray-500">{t('pos.paid')}</span><span className="font-bold" dir="ltr">{money(Math.min(paid, total))} DA</span></div>
          <div className="flex justify-between text-base"><span className="font-bold">{t('pos.remaining')}</span><span className="font-black text-orange-600" dir="ltr">{money(Math.max(0, total - paid))} DA</span></div>
        </div>
        <button disabled={!ok} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-orange-500 text-white font-bold disabled:opacity-50">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}{t('pos.pay_later_confirm')}
        </button>
      </form>
    </div>
  );
}

// /pos/:orderId — تعديل بيع في المحل: السلة تُحمَّل من الطلب، والحفظ يستبدل سطوره (والمخزون بالفرق)
export default function PosPage() {
  const { t } = useTranslation();
  const { orderId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const { storeId, store } = useAuth();
  const [editing, setEditing] = useState(null); // الطلب المعدَّل
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(NO_CUSTOMER); // { id?, name, phone, photoUrl? } — id = من جدول الزبائن
  const [pickingCustomer, setPickingCustomer] = useState(false);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [quick, setQuick] = useState(null); // null | { barcode }
  const [picking, setPicking] = useState(false);
  const [payLater, setPayLater] = useState(false);
  const [serving, setServing] = useState(false);
  const { can } = useAuth();
  const recent = useRef(new Map()); // آخر مسح لكل كود — لا نضيف نفس القطعة مرتين وهي أمام الكاميرا

  const onCode = useCallback(async (raw) => {
    const code = String(raw).trim();
    const now = Date.now();
    if (!code || now - (recent.current.get(code) || 0) < 2000) return;
    recent.current.set(code, now);
    setLooking(true);
    try {
      const { data } = await api.get(`/stores/${storeId}/inventory/barcode/${encodeURIComponent(code)}`);
      if (data?.product?.isArchived) { beep(false); toast.error(t('pos.archived', { name: data.product.name })); return; }
      setCart((c) => addScanned(c, data));
      beep(true);
    } catch (e) {
      beep(false);
      if (e.response?.status === 404) {
        // باركود جديد: إضافته كمنتج سريع بنفس الباركود
        toast.error(t('pos.unknown', { code }), can('product.crud') ? { action: { label: t('pos.add_as_product'), onClick: () => setQuick({ barcode: code }) }, duration: 8000 } : undefined);
      } else toast.error(errorMessage(e, t('inventory.error')));
    } finally {
      setLooking(false);
    }
  }, [storeId, t, can]);

  useEffect(() => {
    setEditing(null);
    if (!orderId) { setCart([]); setCustomer(NO_CUSTOMER); return; }
    api.get(`/orders/get-one/${orderId}`).then(({ data }) => {
      // طلب من الموقع: يُعدَّل من نموذج الطلب العادي
      if (data?.platform !== 'pos') return nav(`/orders/${orderId}/edit`, { replace: true });
      const c = orderToCart.customer(data);
      setCart(orderToCart(data)); setCustomer(c); setEditing(data);
    }).catch((e) => { toast.error(errorMessage(e, t('orders.load_failed'))); nav('/orders'); });
  }, [orderId, nav, t]);

  // من الماسح («بيع» في بطاقة المنتج): السلة تبدأ بالمنتج الممسوح — بعد التصفير أعلاه
  const fromScan = !orderId ? location.state?.add : null;
  useEffect(() => {
    if (!fromScan?.product) return;
    setCart((c) => addScanned(c, fromScan));
    const code = fromScan.variant?.barcode || fromScan.product.barcode;
    if (code) recent.current.set(String(code), Date.now()); // نفس القطعة أمام الكاميرا لا تُضاف مرة ثانية
    nav('/pos', { replace: true, state: null });
  }, [fromScan, nav]);

  const total = cartTotal(cart);
  const confirm = async (credit = null) => {
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/orders/${storeId}/pos/${editing.id}`, saleBody(cart, customer));
        toast.success(t('pos.updated'));
        return nav(`/orders/${editing.id}`, { replace: true });
      }
      const { data } = await api.post(`/orders/${storeId}/pos`, saleBody(cart, customer, credit));
      setReceipt(data);
      setCart([]); setCustomer(NO_CUSTOMER); setPayLater(false);
      toast.success(t(data?.status === 'unpaid' ? 'pos.done_credit' : 'pos.done'));
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setSaving(false); }
  };

  if (receipt) return <Receipt order={receipt} store={store} onNext={() => setReceipt(null)} />;

  return (
    <div className="max-w-xl mx-auto space-y-3 pb-4">
      {orderId && !editing && <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
      {editing && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2.5 text-sm">
          <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="flex-1 min-w-0 font-semibold text-amber-800 dark:text-amber-300">{t('pos.editing')} {editing.barcode && <bdi dir="ltr">#{editing.barcode}</bdi>}</span>
          <button type="button" onClick={() => nav(`/orders/${editing.id}`)} className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20">{t('pos.cancel_edit')}</button>
        </div>
      )}
      <div className="relative">
        {/* يتوقف الماسح أثناء «منتج سريع» (يحرّر الكاميرا الخلفية لتصوير المنتج) وأثناء اختيار منتج */}
        <Scanner onDetected={onCode} continuous paused={!!quick || picking} />
        {looking && <span className="absolute top-3 end-3 p-2 rounded-full bg-black/60"><Loader2 className="w-4 h-4 animate-spin text-white" /></span>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setPicking(true)} className={`${can('product.crud') ? '' : 'col-span-2 '}flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold`}><ListPlus className="w-4 h-4" />{t('pos.pick')}</button>
        {can('product.crud') && (
          <button type="button" onClick={() => setQuick({ barcode: '' })} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400"><PackagePlus className="w-4 h-4" />{t('quick.title')}</button>
        )}
      </div>
      <button type="button" onClick={() => setServing(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-sm font-bold text-gray-600 dark:text-zinc-300"><ReceiptIcon className="w-4 h-4" />{t('pos.service_title')}</button>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-gray-400 text-center"><ShoppingBag className="w-9 h-9" /><p className="text-sm max-w-xs">{t('pos.empty')}</p></div>
      ) : (
        <div className={`${box} divide-y divide-gray-100 dark:divide-zinc-800`}>
          {cart.map((l) => (
            <div key={l.key} className="p-3 flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">{l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : l.service ? <ReceiptIcon className="w-5 h-5 text-indigo-400" /> : <Package className="w-5 h-5 text-gray-400" />}</span>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold truncate"><bdi>{l.name}</bdi></p>
                {l.parts.length > 0 && <VariantParts parts={l.parts} className="text-xs text-gray-500" />}
                <div className="flex items-center gap-1">
                  <input type="number" inputMode="numeric" dir="ltr" min="0" value={l.price} onChange={(e) => setCart((c) => setLine(c, l.key, { price: e.target.value === '' ? '' : Number(e.target.value) }))} className="w-24 px-2 py-1 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-sm font-bold" />
                  <span className="text-[11px] text-gray-400">DA</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setCart((c) => setLine(c, l.key, { quantity: l.quantity - 1 }))} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">{l.quantity === 1 ? <Trash2 className="w-4 h-4 text-rose-500" /> : <Minus className="w-4 h-4" />}</button>
                <span className="w-7 text-center font-black" dir="ltr">{l.quantity}</span>
                <button type="button" onClick={() => setCart((c) => setLine(c, l.key, { quantity: l.quantity + 1 }))} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <>
          <CustomerBox customer={customer} onPick={() => setPickingCustomer(true)} onClear={() => setCustomer(NO_CUSTOMER)} />
          {!editing && (
            <button type="button" disabled={saving || cart.some((l) => l.price === '')} onClick={() => setPayLater(true)} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 text-sm font-bold disabled:opacity-60"><Clock className="w-4 h-4" />{t('pos.pay_later')}</button>
          )}
          <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 z-20">
            <button type="button" disabled={saving || cart.some((l) => l.price === '')} onClick={() => confirm()} className="w-full flex items-center justify-between gap-2 px-5 py-4 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg disabled:opacity-60">
              <span className="flex items-center gap-2">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}{t(editing ? 'pos.save_edit' : 'pos.confirm', { count: cart.reduce((s, l) => s + l.quantity, 0) })}</span>
              <span className="text-lg font-black" dir="ltr">{money(total)} DA</span>
            </button>
          </div>
        </>
      )}

      {payLater && <PayLaterSheet total={total} customer={customer} onPickCustomer={() => setPickingCustomer(true)} onClearCustomer={() => setCustomer(NO_CUSTOMER)} saving={saving} onClose={() => setPayLater(false)} onConfirm={(paidNow) => confirm({ payLater: true, paidNow })} />}
      {pickingCustomer && <CustomerPickerSheet storeId={storeId} onClose={() => setPickingCustomer(false)} onPick={(c) => { setCustomer({ id: c.id, name: c.name, phone: c.phone, photoUrl: c.photoUrl }); setPickingCustomer(false); }} />}

      {serving && <ServiceSheet onClose={() => setServing(false)} onAdd={(svc) => { setCart((c) => addService(c, svc)); setServing(false); beep(true); }} />}
      {picking && <PickSheet storeId={storeId} cart={cart} onClose={() => setPicking(false)} onPick={(hit) => { setCart((c) => addScanned(c, hit)); beep(true); }}
        onRemove={(key) => setCart((c) => setLine(c, key, { quantity: (c.find((l) => l.key === key)?.quantity || 0) - 1 }))} />}

      {quick && (
        <QuickProductSheet storeId={storeId} barcode={quick.barcode} onClose={() => setQuick(null)}
          onCreated={(p) => {
            setQuick(null);
            // يدخل السلة بباركوده (بمقاسات: نسخة أول تركيبة)، وإلا كمنتج عادي
            if (p.barcode) { recent.current.delete(p.barcode); onCode(p.barcode); }
            else if (!p.hasVariants && p.id) setCart((c) => addScanned(c, { product: { id: p.id, name: p.name, price: p.price, image: p.image }, variant: null }));
          }} />
      )}
    </div>
  );
}
