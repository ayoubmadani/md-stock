// طلب ممسوح (الماسح أو البيع في المحل): ملخص + الخطوة التالية + «عرض» و«تعديل»
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, MapPin, Pencil, Phone } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/orders';
import { NextStepCard, OrderStatusBadge, ShipSheet } from './orders';
import OrderForm from '../pages/OrderForm';

export default function ScannedOrder({ order, storeId, onChange }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const [ship, setShip] = useState(false);
  const [editing, setEditing] = useState(false); // تعديل طلب الموقع في مودل فوق الصفحة الحالية (لا نغادر البيع في المحل)
  const reload = () => api.get(`/orders/get-one/${order.id}`).then((r) => onChange(r.data)).catch(() => {});
  // نفس قاعدة صفحة الطلب: طلب المحل يُعدَّل من البيع في المحل، وطلب شركة التأكيد لا يُعدَّل
  const canEdit = can(order.platform === 'pos' ? 'pos.sell' : 'order.manage') && !order.confirmationCompanyId;
  const btn = 'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-semibold';

  return (
    <>
      <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold tracking-wider text-gray-500" dir="ltr">{order.barcode}</span>
          <OrderStatusBadge order={order} />
        </div>
        <div className="min-w-0">
          <p className="font-bold truncate"><bdi>{order.customerName || '—'}</bdi></p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {order.customerPhone && <a href={`tel:${order.customerPhone}`} dir="ltr" className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400"><Phone className="w-3.5 h-3.5" />{order.customerPhone}</a>}
            {order.customerWilaya && <span className="flex items-center gap-1 truncate"><MapPin className="w-3.5 h-3.5" />{order.customerWilaya.ar_name}</span>}
          </div>
        </div>
        <div className="space-y-1 text-sm">
          {(order.items || []).map((it) => (
            <p key={it.id} className="truncate text-gray-600 dark:text-zinc-300"><span dir="ltr">{it.quantity}×</span> <bdi>{it.product?.name || it.title}</bdi></p>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800">
          <span className="text-sm text-gray-500">{t('orders.total')}</span>
          <b className="text-emerald-600 dark:text-emerald-400" dir="ltr">{money(order.totalPrice)} DA</b>
        </div>
      </div>
      {can('order.manage') && <NextStepCard order={order} highlight onShip={() => setShip(true)} onChanged={(st) => onChange({ ...order, status: st })} />}
      <div className="flex gap-2">
        <Link to={`/orders/${order.id}`} className={btn}><ExternalLink className="w-4 h-4" />{t('scan.open_order')}</Link>
        {canEdit && (order.platform === 'pos'
          ? <Link to={`/pos/${order.id}`} className={btn}><Pencil className="w-4 h-4" />{t('orders.actions.edit')}</Link>
          : <button type="button" onClick={() => setEditing(true)} className={btn}><Pencil className="w-4 h-4" />{t('orders.actions.edit')}</button>)}
      </div>
      {editing && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-gray-50 dark:bg-zinc-950 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <OrderForm orderId={order.id} onClose={() => setEditing(false)} onDone={() => { setEditing(false); reload(); }} />
        </div>
      )}
      {ship && <ShipSheet order={order} storeId={storeId} onClose={() => setShip(false)} onDone={() => { setShip(false); reload(); }} />}
    </>
  );
}
