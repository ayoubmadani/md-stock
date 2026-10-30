// زبون واحد: صورته وهاتفاه (اتصال/واتساب)، ما تبقّى عليه، طلباته، والتعديل والحذف
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, MessageCircle, Pencil, Phone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, paymentState, whatsappLink } from '../lib/orders';
import { CustomerAvatar, CustomerFormSheet } from '../components/customers';
import { OrderStatusBadge, timeAgo } from '../components/orders';

const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4';

export default function CustomerDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const { storeId, can } = useAuth();
  const [c, setC] = useState(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(() => api.get(`/stores/${storeId}/customers/${id}`).then((r) => setC(r.data))
    .catch((e) => { toast.error(errorMessage(e, t('inventory.error'))); nav('/customers'); }), [storeId, id, nav, t]);
  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    if (!window.confirm(t('customers.delete_confirm'))) return;
    setDeleting(true);
    try { await api.delete(`/stores/${storeId}/customers/${id}`); toast.success(t('customers.deleted')); nav('/customers'); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); setDeleting(false); }
  };

  if (!c) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  const phones = [c.phone, c.phone2].filter(Boolean);
  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/customers" className="flex items-center gap-1 text-sm text-gray-500"><ArrowRight className="w-4 h-4 ltr:rotate-180" />{t('product.back')}</Link>
        {can('pos.sell') && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setEditing(true)} className="p-2 rounded-lg text-gray-500"><Pencil className="w-4 h-4" /></button>
            <button type="button" disabled={deleting} onClick={remove} className="p-2 rounded-lg text-rose-500 disabled:opacity-50">{deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button>
          </div>
        )}
      </div>

      <div className={`${box} space-y-3`}>
        <div className="flex items-center gap-3">
          <CustomerAvatar c={c} size="w-16 h-16" />
          <div className="min-w-0">
            <p className="font-bold text-lg truncate"><bdi>{c.name}</bdi></p>
            <p className="text-xs text-gray-500">{t('customers.orders_count', { count: c.orders })}</p>
          </div>
        </div>
        {phones.map((p) => (
          <div key={p} className="flex items-center gap-2">
            <span className="flex-1 text-sm font-semibold" dir="ltr" style={{ textAlign: 'start' }}>{p}</span>
            <a href={`tel:${p}`} className="p-2.5 rounded-xl bg-indigo-600 text-white"><Phone className="w-4 h-4" /></a>
            <a href={whatsappLink(p)} target="_blank" rel="noreferrer" className="p-2.5 rounded-xl bg-emerald-500 text-white"><MessageCircle className="w-4 h-4" /></a>
          </div>
        ))}
      </div>

      {Number(c.debt) > 0 && (
        <div className="flex items-center justify-between rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 px-4 py-3">
          <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">{t('customers.debt')}</span>
          <bdi dir="ltr" className="font-black text-lg text-orange-700 dark:text-orange-300">{money(c.debt)} DA</bdi>
        </div>
      )}

      <div className={`${box} space-y-1`}>
        <p className="font-bold mb-2">{t('customers.orders')}</p>
        {!c.orderList?.length && <p className="text-sm text-gray-400 py-4 text-center">{t('customers.no_orders')}</p>}
        {c.orderList?.map((o) => (
          <Link key={o.id} to={`/orders/${o.id}`} className="flex items-center gap-3 py-2 border-b last:border-0 border-gray-100 dark:border-zinc-800">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold" dir="ltr" style={{ textAlign: 'start' }}>{money(o.totalPrice)} DA</span>
              <span className="block text-[11px] text-gray-400">{o.barcode && <bdi dir="ltr">#{o.barcode} · </bdi>}{timeAgo(o.createdAt, i18n.language)}</span>
              {o.status === 'unpaid' && <span className="block text-[11px] font-bold text-orange-600">{t('pos.remaining')}: <bdi dir="ltr">{money(paymentState(o).remaining)}</bdi></span>}
            </span>
            <OrderStatusBadge order={o} />
          </Link>
        ))}
      </div>

      {editing && <CustomerFormSheet storeId={storeId} customer={c} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
    </div>
  );
}
