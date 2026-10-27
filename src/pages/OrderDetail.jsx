// صفحة طلب واحد: الزبون (اتصال/واتساب/نسخ)، العنوان، المنتجات، المبالغ، والحالة
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Barcode, Check, Clock, Copy, Loader2, MapPin, MessageCircle, Pencil, Phone, PhoneCall, Receipt, Trash2, Truck, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, nextActions, paymentState, whatsappLink } from '../lib/orders';
import { NextStepCard, OrderStatusBadge, SendConfirmationSheet, ShipSheet, StatusSheet, timeAgo } from '../components/orders';
import { VariantParts } from '../components/inventory';

const QUEUE = ['pending', 'appl1', 'appl2', 'appl3', 'postponed'];
const actionBtn = 'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold';
const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4';

// بيع بالدين (في المحل): المدفوع، المتبقي، سجل الدفعات، وتسجيل دفعة (جزئية أو كل الباقي)
function PaymentsCard({ order, canPay, onPaid }) {
  const { t, i18n } = useTranslation();
  const { storeId } = useAuth();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const { paid, remaining } = paymentState(order);
  const unpaid = order.status === 'unpaid';
  const pay = async (value) => {
    const a = Number(value);
    if (!(a > 0) || a > remaining) return toast.error(t('pos.amount_invalid'));
    setBusy(true);
    try {
      const { data } = await api.post(`/orders/${storeId}/pos/${order.id}/payments`, { amount: a });
      setAmount('');
      toast.success(data?.status === 'delivered' ? t('pos.settled') : t('pos.payment_saved'));
      onPaid(data);
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(false); }
  };
  return (
    <div className={`${box} space-y-3 ${unpaid ? 'border-orange-200 dark:border-orange-500/30' : ''}`}>
      <p className="font-bold flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" />{t('pos.payments')}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-gray-50 dark:bg-zinc-950 p-2"><p className="text-[11px] text-gray-500">{t('pos.total')}</p><p className="font-bold text-sm" dir="ltr">{money(order.totalPrice)}</p></div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-2"><p className="text-[11px] text-emerald-700 dark:text-emerald-400">{t('pos.paid')}</p><p className="font-bold text-sm text-emerald-700 dark:text-emerald-400" dir="ltr">{money(paid)}</p></div>
        <div className="rounded-xl bg-orange-50 dark:bg-orange-500/10 p-2"><p className="text-[11px] text-orange-700 dark:text-orange-400">{t('pos.remaining')}</p><p className="font-black text-sm text-orange-700 dark:text-orange-400" dir="ltr">{money(remaining)}</p></div>
      </div>
      {(order.payments || []).length > 0 && (
        <div className="space-y-1">
          {order.payments.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs text-gray-500">
              <span>{p.at ? new Date(p.at).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' }) : '—'}</span>
              <span className="font-bold text-gray-700 dark:text-zinc-300" dir="ltr">+{money(p.amount)} DA</span>
            </div>
          ))}
        </div>
      )}
      {unpaid && canPay && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); pay(amount); }} className="flex gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" dir="ltr" min="0" placeholder={t('pos.amount')} className="flex-1 min-w-0 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400" />
            <button disabled={busy || !amount} className="shrink-0 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">{t('pos.add_payment')}</button>
          </form>
          <button type="button" disabled={busy} onClick={() => pay(remaining)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{t('pos.pay_all')} <bdi dir="ltr">{money(remaining)} DA</bdi>
          </button>
        </>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500 dark:text-zinc-400">{label}</span>
      <span className="font-semibold text-end min-w-0">{children}</span>
    </div>
  );
}

export default function OrderDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, storeId } = useAuth();
  const [order, setOrder] = useState(null);
  const [action, setAction] = useState(null); // 'confirm' | 'ship'
  const [recalling, setRecalling] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [params] = useSearchParams();
  const scanned = params.get('scanned') === '1';
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => api.get(`/orders/get-one/${id}`)
    .then((r) => setOrder(r.data))
    .catch(() => { toast.error(t('orders.load_failed')); navigate('/orders'); }), [id, navigate, t]);
  useEffect(() => { load(); }, [load]);

  if (!order) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const items = order.items || [];
  const wa = whatsappLink(order.customerWhatsapp || order.customerPhone);
  const subtotal = items.reduce((s, i) => s + Number(i.finalPrice || 0) * Number(i.quantity || 1), 0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.customerPhone || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* المتصفح منع النسخ */ }
  };

  // نفس شروط أزرار القائمة في اللوحة
  const queue = QUEUE.includes(order.status);
  // بيع في المحل: لا شركة تأكيد ولا شحن
  const pos = order.platform === 'pos';
  const canSend = can('order.manage') && queue && !order.confirmationCompanyId && !order.isDigital && !pos;
  const canRecall = can('order.manage') && order.confirmationCompanyId && (queue || order.status === 'cancelled');
  const canShip = can('order.manage') && !pos && order.status === 'confirmed' && !order.shippingTrackingId && !order.isDigital && !nextActions(order).some((a) => a.action === 'ship');
  const canEdit = can('order.manage') && !order.confirmationCompanyId;

  const recall = async () => {
    setRecalling(true);
    try {
      const { data } = await api.post(`/stores/${storeId}/confirmation/recall`, { orderIds: [order.id] });
      if (data?.recalled) { toast.success(t('orders.actions.recalled')); load(); } else toast.warning(t('orders.actions.not_recalled'));
    } catch (e) {
      toast.error(errorMessage(e, t('orders.save_failed')));
    } finally {
      setRecalling(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t('orders.confirm_delete'))) return;
    try {
      await api.delete(`/orders/${order.id}`);
      toast.success(t('orders.deleted'));
      navigate('/orders');
    } catch (e) {
      toast.error(errorMessage(e, t('orders.save_failed')));
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500"><ArrowRight className="w-4 h-4 ltr:rotate-180" />{t('product.back')}</button>
        <span className="flex flex-col items-center text-xs text-gray-400">
          {order.barcode && <span className="flex items-center gap-1 font-bold tracking-wider text-gray-600 dark:text-zinc-300" dir="ltr"><Barcode className="w-3.5 h-3.5" />{order.barcode}</span>}
          {order.createdAt && timeAgo(order.createdAt, i18n.language)}
        </span>
        {can('order.manage') && !order.confirmationCompanyId
          ? <button type="button" onClick={remove} className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
          : <span className="w-8" />}
      </div>

      {/* الحالة */}
      <div className={`${box} flex items-center justify-between gap-3`}>
        <div className="min-w-0">
          <p className="text-xs text-gray-400">{t('orders.status_label')}</p>
          {order.confirmationCompany && (
            <p className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1 truncate">
              <PhoneCall className="w-3.5 h-3.5 shrink-0" />{t('orders.at_company', { name: order.confirmationCompany.name })}
            </p>
          )}
          {order.shippingTrackingId && (
            <p className="flex items-center gap-1 text-xs text-gray-500 mt-1"><Truck className="w-3.5 h-3.5" /><span dir="ltr">{order.shippingTrackingId}</span></p>
          )}
        </div>
        <OrderStatusBadge order={order} onClick={can('order.manage') ? () => setSheet(true) : undefined} />
      </div>

      {/* الخطوة التالية */}
      {order.platform === 'pos' && (order.status === 'unpaid' || order.payments?.length > 0) && <PaymentsCard order={order} canPay={can('order.manage')} onPaid={(o) => setOrder((x) => ({ ...x, ...o }))} />}
      {can('order.manage') && <NextStepCard order={order} highlight={scanned} onShip={() => setAction('ship')} onChanged={(st) => setOrder((o) => ({ ...o, status: st }))} />}

      {/* إجراءات */}
      {(canEdit || canSend || canRecall || canShip) && (
        <div className="grid grid-cols-2 gap-2">
          {canEdit && <Link to={order.platform === 'pos' ? `/pos/${order.id}` : `/orders/${order.id}/edit`} className={`${actionBtn} bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800`}><Pencil className="w-4 h-4" />{t('orders.actions.edit')}</Link>}
          {canSend && <button type="button" onClick={() => setAction('confirm')} className={`${actionBtn} bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400`}><PhoneCall className="w-4 h-4" />{t('orders.actions.send_confirm')}</button>}
          {canRecall && <button type="button" disabled={recalling} onClick={recall} className={`${actionBtn} bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 disabled:opacity-60`}>{recalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}{t('orders.actions.recall')}</button>}
          {canShip && <button type="button" onClick={() => setAction('ship')} className={`${actionBtn} bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400`}><Truck className="w-4 h-4" />{t('orders.actions.ship')}</button>}
        </div>
      )}

      {/* الزبون */}
      <div className={`${box} space-y-3`}>
        <p className="font-bold text-lg"><bdi>{order.customerName || '—'}</bdi></p>
        <p className="text-sm font-semibold -mt-2"><span dir="ltr">{order.customerPhone}</span></p>
        <div className="grid grid-cols-3 gap-2">
          <a href={`tel:${order.customerPhone}`} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold">
            <Phone className="w-5 h-5" />{t('orders.call')}
          </a>
          {wa ? (
            <a href={wa} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold">
              <MessageCircle className="w-5 h-5" />WhatsApp
            </a>
          ) : <span />}
          <button type="button" onClick={copy} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold">
            {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}{t('orders.copy')}
          </button>
        </div>
        {/* بيع في المحل: لا عنوان ولا توصيل */}
        {order.platform === 'pos' ? null : order.isDigital ? (
          order.customerEmail && <Row label="Email"><span dir="ltr">{order.customerEmail}</span></Row>
        ) : (
          <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-950 rounded-xl p-3">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
            <div>
              <p className="font-semibold">{[order.customerWilaya?.ar_name, order.customerCommune?.ar_name].filter(Boolean).join(' — ') || '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">{order.typeShip === 'office' ? t('orders.ship_office') : t('orders.ship_home')}</p>
            </div>
          </div>
        )}
      </div>

      {/* المنتجات */}
      <div className={`${box} space-y-3`}>
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
              {it.product?.imagesProduct?.[0]?.imageUrl ? <img src={it.product.imagesProduct[0].imageUrl} alt="" className="w-full h-full object-cover" /> : !it.productId && <Receipt className="w-5 h-5 text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate"><bdi>{it.product?.name || it.title || '—'}</bdi></p>
              {Array.isArray(it.variantDetail?.name) && <VariantParts parts={it.variantDetail.name} className="text-xs text-gray-500 mt-0.5" />}
              {!it.productId && <p className="text-[11px] text-gray-400">{t('pos.service')}{it.cost != null && <> · {t('pos.service_cost')}: <bdi dir="ltr">{money(it.cost)}</bdi></>}</p>}
              {it.addons?.length > 0 && <p className="text-[11px] text-gray-400 truncate">+ {it.addons.map((a) => a.name).join('، ')}</p>}
            </div>
            <div className="text-end shrink-0">
              <p className="text-sm font-bold" dir="ltr">{money(it.finalPrice)} DA</p>
              <p className="text-xs text-gray-400" dir="ltr">× {it.quantity}</p>
            </div>
          </div>
        ))}
        <div className="border-t border-gray-100 dark:border-zinc-800 pt-3 space-y-1.5">
          <Row label={t('orders.subtotal')}><span dir="ltr">{money(subtotal)} DA</span></Row>
          {!order.isDigital && <Row label={t('orders.shipping_fee')}><span dir="ltr">{money(order.priceShip)} DA</span></Row>}
          <Row label={t('orders.total')}><span dir="ltr" className="text-lg font-black text-emerald-600 dark:text-emerald-400">{money(subtotal + (order.isDigital ? 0 : Number(order.priceShip || 0)))} DA</span></Row>
        </div>
      </div>

      {action === 'confirm' && <SendConfirmationSheet order={order} storeId={storeId} onClose={() => setAction(null)} onDone={() => { setAction(null); load(); }} />}
      {action === 'ship' && <ShipSheet order={order} storeId={storeId} onClose={() => setAction(null)} onDone={() => { setAction(null); load(); }} />}
      {sheet && <StatusSheet order={order} onClose={() => setSheet(false)} onChanged={(s) => { setSheet(false); setOrder((o) => ({ ...o, status: s })); }} />}
    </div>
  );
}
