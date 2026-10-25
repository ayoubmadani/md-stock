// الطلبات المتروكة: زبائن كتبوا هاتفهم في نموذج الطلب ولم يُكملوا — اتصال، واتساب، تحويل إلى طلب، تجاهل
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, MapPin, MessageCircle, Package, Phone, PlusCircle, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money, whatsappLink } from '../lib/orders';
import { timeAgo } from '../components/orders';

export default function AbandonedPage() {
  const { t, i18n } = useTranslation();
  const { storeId, can } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (p = 1) => {
    const { data } = await api.get(`/stores/${storeId}/abandoned`, { params: { page: p } });
    setHasMore(data.hasMore);
    setPage(p);
    setItems((prev) => (p === 1 ? data.items : [...(prev || []), ...data.items]));
  }, [storeId]);
  useEffect(() => { setItems(null); load(1).catch(() => setItems([])); }, [load]);

  const dismiss = async (a) => {
    try {
      await api.delete(`/stores/${storeId}/abandoned/${a.id}`);
      setItems((l) => l.filter((x) => x.id !== a.id));
    } catch (e) {
      toast.error(errorMessage(e, t('inventory.error')));
    }
  };

  // نموذج طلب جديد مملوء بما كتبه الزبون
  const convert = (a) => navigate('/orders/new', { state: { draft: { name: a.name, phone: a.phone, productId: a.productId, abandonedId: a.id } } });

  if (!items) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed px-1">{t('abandoned.hint')}</p>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-gray-400"><ShoppingCart className="w-9 h-9" /><p className="text-sm">{t('abandoned.empty')}</p></div>
      ) : items.map((a) => {
        const wa = whatsappLink(a.phone);
        return (
          <div key={a.id} className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-3 space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                {a.productImage ? <img src={a.productImage} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate"><bdi>{a.name || t('abandoned.no_name')}</bdi></p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{a.productName ? <><bdi>{a.productName}</bdi>{a.productPrice ? <> · <bdi dir="ltr">{money(a.productPrice)} DA</bdi></> : null}</> : '—'}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                  <span>{timeAgo(a.updatedAt, i18n.language)}</span>
                  {a.wilaya && <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3" />{a.wilaya}</span>}
                  {a.pastOrders > 0 && <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 font-semibold">{t('abandoned.past', { count: a.pastOrders })}</span>}
                </div>
              </div>
              {can('order.manage') && <button type="button" onClick={() => dismiss(a)} title={t('abandoned.dismiss')} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500"><X className="w-4 h-4" /></button>}
            </div>
            <div className={`grid gap-2 ${can('order.manage') ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <a href={`tel:${a.phone}`} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"><Phone className="w-4 h-4" /><span dir="ltr">{a.phone}</span></a>
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold"><MessageCircle className="w-4 h-4" />WhatsApp</a>}
              {can('order.manage') && <button type="button" onClick={() => convert(a)} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-xs font-bold"><PlusCircle className="w-4 h-4" />{t('abandoned.convert')}</button>}
            </div>
          </div>
        );
      })}
      {hasMore && (
        <button type="button" onClick={() => load(page + 1)} className="w-full py-3 rounded-xl border border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-600 dark:text-zinc-300">{t('orders.more')}</button>
      )}
    </div>
  );
}
