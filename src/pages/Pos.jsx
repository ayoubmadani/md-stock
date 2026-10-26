// بيع في المحل: مسح المنتجات (كاميرا أو قارئ باركود)، تعديل الكمية والسعر، زبون اختياري،
// ثم «تأكيد البيع» ← طلب «مسلّم» (يُخصم المخزون) وإيصال بباركود الطلب
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import JsBarcode from 'jsbarcode';
import { Check, Loader2, Minus, Package, PackagePlus, Plus, Printer, ShoppingBag, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/orders';
import { addScanned, cartTotal, saleBody, setLine } from '../lib/pos';
import Scanner from '../components/Scanner';
import QuickProductSheet from '../components/QuickProductSheet';
import { input } from '../components/product';

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
            <span className="min-w-0"><bdi>{it.product?.name || '—'}</bdi> <span className="text-gray-500" dir="ltr">×{it.quantity}</span></span>
            <span className="font-bold shrink-0" dir="ltr">{money(it.finalPrice * it.quantity)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-300" />
        <div className="flex items-center justify-between font-black text-lg"><span>{t('pos.total')}</span><span dir="ltr">{money(order.totalPrice)} DA</span></div>
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

export default function PosPage() {
  const { t } = useTranslation();
  const { storeId, store } = useAuth();
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [showCustomer, setShowCustomer] = useState(false);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [quick, setQuick] = useState(null); // null | { barcode }
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

  const total = cartTotal(cart);
  const confirm = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/orders/${storeId}/pos`, saleBody(cart, customer));
      setReceipt(data);
      setCart([]); setCustomer({ name: '', phone: '' }); setShowCustomer(false);
      toast.success(t('pos.done'));
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setSaving(false); }
  };

  if (receipt) return <Receipt order={receipt} store={store} onNext={() => setReceipt(null)} />;

  return (
    <div className="max-w-xl mx-auto space-y-3 pb-4">
      <div className="relative">
        <Scanner onDetected={onCode} />
        {looking && <span className="absolute top-3 end-3 p-2 rounded-full bg-black/60"><Loader2 className="w-4 h-4 animate-spin text-white" /></span>}
      </div>

      {can('product.crud') && (
        <button type="button" onClick={() => setQuick({ barcode: '' })} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400"><PackagePlus className="w-4 h-4" />{t('quick.title')}</button>
      )}

      {cart.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-gray-400 text-center"><ShoppingBag className="w-9 h-9" /><p className="text-sm max-w-xs">{t('pos.empty')}</p></div>
      ) : (
        <div className={`${box} divide-y divide-gray-100 dark:divide-zinc-800`}>
          {cart.map((l) => (
            <div key={l.key} className="p-3 flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">{l.image ? <img src={l.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}</span>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold truncate"><bdi>{l.name}</bdi>{l.parts.length > 0 && <span className="text-gray-400 text-xs"> · {l.parts.map((p) => p.value).join(' / ')}</span>}</p>
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
          {showCustomer ? (
            <div className={`${box} p-3 grid grid-cols-2 gap-2`}>
              <input value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} type="tel" inputMode="tel" dir="ltr" placeholder={t('pos.phone')} className={input} />
              <input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder={t('pos.name')} className={input} />
            </div>
          ) : (
            <button type="button" onClick={() => setShowCustomer(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-xs font-bold text-gray-500"><User className="w-4 h-4" />{t('pos.add_customer')}</button>
          )}
          <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 z-20">
            <button type="button" disabled={saving || cart.some((l) => l.price === '')} onClick={confirm} className="w-full flex items-center justify-between gap-2 px-5 py-4 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg disabled:opacity-60">
              <span className="flex items-center gap-2">{saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}{t('pos.confirm', { count: cart.reduce((s, l) => s + l.quantity, 0) })}</span>
              <span className="text-lg font-black" dir="ltr">{money(total)} DA</span>
            </button>
          </div>
        </>
      )}

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
