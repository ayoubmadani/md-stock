// صفحة طلب واحد: الزبون (اتصال/واتساب/نسخ)، العنوان، المنتجات، المبالغ، والحالة
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, Copy, Loader2, MapPin, MessageCircle, Pencil, Phone, PhoneCall, Trash2, Truck, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, whatsappLink } from '../lib/orders';
import { OrderStatusBadge, SendConfirmationSheet, ShipSheet, StatusSheet, timeAgo } from '../components/orders';
import { VariantParts } from '../components/inventory';

const QUEUE = ['pending', 'appl1', 'appl2', 'appl3', 'postponed'];
const actionBtn = 'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold';
const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4';

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
  const canSend = can('order.manage') && queue && !order.confirmationCompanyId && !order.isDigital;
  const canRecall = can('order.manage') && order.confirmationCompanyId && (queue || order.status === 'cancelled');
  const canShip = can('order.manage') && order.status === 'confirmed' && !order.shippingTrackingId && !order.isDigital;
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
        <span className="text-xs text-gray-400">{order.createdAt && timeAgo(order.createdAt, i18n.language)}</span>
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

      {/* إجراءات */}
      {(canEdit || canSend || canRecall || canShip) && (
        <div className="grid grid-cols-2 gap-2">
          {canEdit && <Link to={`/orders/${order.id}/edit`} className={`${actionBtn} bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800`}><Pencil className="w-4 h-4" />{t('orders.actions.edit')}</Link>}
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
        {order.isDigital ? (
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
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
              {it.product?.imagesProduct?.[0]?.imageUrl && <img src={it.product.imagesProduct[0].imageUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate"><bdi>{it.product?.name || '—'}</bdi></p>
              {Array.isArray(it.variantDetail?.name) && <VariantParts parts={it.variantDetail.name} className="text-xs text-gray-500 mt-0.5" />}
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
