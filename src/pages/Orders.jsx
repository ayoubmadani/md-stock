// قائمة الطلبات للهاتف: تبويبات الحالات بعددها، بحث بالاسم أو الهاتف، وتغيير الحالة من البطاقة
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Globe, Loader2, MapPin, Phone, Plus, Search, ShieldAlert, Store as StoreIcon, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { POS_STATUSES, STATUSES, STATUS_DOT, money, orderAmounts, paymentState, sumCounts } from '../lib/orders';
import { OrderStatusBadge, StatusSheet, timeAgo } from '../components/orders';

const PAGE_SIZE = 50; // نفس حد الخادم

function OrderCard({ order, canManage, onStatus }) {
  const { t, i18n } = useTranslation();
  const items = order.items || [];
  const first = items[0];
  const image = first?.product?.imagesProduct?.[0]?.imageUrl;
  const amounts = orderAmounts(order); // سعر البيع، والإجمالي مع التوصيل
  const navigate = useNavigate();
  return (
    <div role="link" tabIndex={0} onClick={() => navigate(`/orders/${order.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.id}`)}
      className="cursor-pointer block rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-3 space-y-2.5">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">
          {image && <img src={image} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-bold text-sm truncate"><bdi>{order.customerName || '—'}</bdi></p>
            {!order.customerId && <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" title={t('orders.suspicious')} />}
          </div>
          <p className="text-xs text-gray-500 dark:text-zinc-400 truncate mt-0.5">
            {first ? <><span dir="ltr">{first.quantity}×</span> <bdi>{first.product?.name || first.title}</bdi></> : '—'}
            {items.length > 1 && <span className="text-indigo-500 font-semibold"> +{items.length - 1}</span>}
          </p>
        </div>
        <div className="text-end shrink-0">
          <p className="font-black text-sm text-emerald-600 dark:text-emerald-400" dir="ltr">{money(items.length ? amounts.products : order.totalPrice)} DA</p>
          {items.length > 0 && amounts.ship > 0 && <p className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">{t('orders.total')}: <span dir="ltr">{money(amounts.total)} DA</span></p>}
          {order.status === 'unpaid' && <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400">{t('pos.remaining')}: <span dir="ltr">{money(paymentState(order).remaining)}</span></p>}
          <p className="text-[11px] text-gray-400 mt-0.5">{order.createdAt && timeAgo(order.createdAt, i18n.language)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
        <a href={`tel:${order.customerPhone}`} onClick={(e) => e.stopPropagation()} dir="ltr"
          className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
          <Phone className="w-3.5 h-3.5" />{order.customerPhone}
        </a>
        {!order.isDigital && order.customerWilaya && (
          <span className="flex items-center gap-1 min-w-0 truncate"><MapPin className="w-3.5 h-3.5 shrink-0" />{order.customerWilaya.ar_name}</span>
        )}
        <span className="flex-1" />
        <span onClick={(e) => e.stopPropagation()}>
          <OrderStatusBadge order={order} onClick={canManage ? () => onStatus(order) : undefined} />
        </span>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { storeId, can } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(() => ([...STATUSES, 'unpaid'].includes(params.get('status')) ? params.get('status') : ''));
  // تبويبان: طلبات الموقع (أونلاين) / البيع في المحل
  const [channel, setChannel] = useState(() => (params.get('channel') === 'shop' ? 'shop' : 'online'));
  const shown = channel === 'shop' ? POS_STATUSES : STATUSES;
  // «مسلّم» في المحل = «تم البيع»
  const label = (s) => (!s ? t('orders.all') : channel === 'shop' && s === 'delivered' ? t('orders.status.delivered_pos') : t(`orders.status.${s}`));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState({});
  const [statusSheet, setStatusSheet] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [abandoned, setAbandoned] = useState(0);
  useEffect(() => { api.get(`/stores/${storeId}/abandoned/count`).then((r) => setAbandoned(r.data?.count || 0)).catch(() => {}); }, [storeId]);

  // البحث بعد توقف الكتابة
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  const loadCounts = useCallback(() => {
    api.get(`/orders/get-count-status/${storeId}`, { params: { channel } }).then((r) => setCounts(sumCounts(r.data))).catch(() => {});
  }, [storeId, channel]);

  const load = useCallback(async (p) => {
    const { data } = await api.get(`/orders/${storeId}`, { params: { status: status || undefined, query: query || undefined, page: p, channel } });
    const list = Array.isArray(data) ? data : [];
    setHasMore(list.length === PAGE_SIZE);
    setPage(p);
    return list;
  }, [storeId, status, query, channel]);

  useEffect(() => {
    let alive = true;
    setOrders(null);
    load(1).then((list) => alive && setOrders(list)).catch(() => alive && setOrders([]));
    return () => { alive = false; };
  }, [load]);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const more = async () => {
    setLoadingMore(true);
    try {
      const list = await load(page + 1);
      setOrders((o) => [...o, ...list]);
    } finally {
      setLoadingMore(false);
    }
  };

  const onChanged = (order, next) => {
    setSheet(null);
    // خرج من التبويب الحالي ← يُحذف من القائمة
    setOrders((list) => (status && status !== next ? list.filter((o) => o.id !== order.id) : list.map((o) => (o.id === order.id ? { ...o, status: next } : o))));
    loadCounts();
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900">
        {[['online', Globe], ['shop', StoreIcon]].map(([c, Icon]) => (
          <button key={c} type="button" onClick={() => { setChannel(c); setStatus(''); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold ${channel === c ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500'}`}>
            <Icon className="w-4 h-4" />{t(`orders.channel_${c}`)}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('orders.search')} type="search"
          className="w-full ps-9 pe-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-indigo-400" />
      </div>
      {/* إضافة طلب محل = البيع في المحل (صلاحيته وحدها)؛ طلب أونلاين = إدارة الطلبات */}
      {can(channel === 'shop' ? 'pos.sell' : 'order.manage') && (
        <Link to={channel === 'shop' ? '/pos' : '/orders/new'} aria-label={t('orders.form.new')} className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">{t('orders.form.new')}</span>
        </Link>
      )}
      </div>

      {channel === 'online' && abandoned > 0 && (
        <Link to="/abandoned" className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm font-semibold">
          <span>{t('abandoned.banner', { count: abandoned })}</span><span aria-hidden>←</span>
        </Link>
      )}

      {/* الهاتف: زر يشبه select يفتح قائمة الحالات */}
      <button type="button" onClick={() => setStatusSheet(true)} className="md:hidden w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-sm font-bold">
        {status ? <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} /> : <span className="w-2 h-2 rounded-full bg-indigo-500" />}
        <span className="flex-1 text-start">{label(status)}</span>
        <span className="text-xs text-gray-400" dir="ltr">{counts[status || 'all'] ?? 0}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {statusSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setStatusSheet(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl w-full max-h-[85dvh] overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="font-bold">{t('orders.filter_status')}</p>
              <button type="button" onClick={() => setStatusSheet(false)} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            {['', ...shown].map((s) => {
              const active = status === s;
              return (
                <button key={s || 'all'} type="button" onClick={() => { setStatus(s); setStatusSheet(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold ${active ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : ''}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s ? STATUS_DOT[s] : 'bg-indigo-500'}`} />
                  <span className="flex-1 text-start">{label(s)}</span>
                  <span className="min-w-[2rem] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs text-gray-600 dark:text-zinc-300 text-center" dir="ltr">{counts[s || 'all'] ?? 0}</span>
                  {active ? <Check className="w-4 h-4" /> : <span className="w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* الكمبيوتر: تبويبات الحالات */}
      <div className="hidden md:flex gap-1.5 flex-wrap pb-1">
        {['', ...shown].map((s) => {
          const active = status === s;
          return (
            <button key={s || 'all'} type="button" onClick={() => setStatus(s)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border ${active ? 'bg-indigo-600 text-white border-transparent' : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300'}`}>
              {s && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white/80' : STATUS_DOT[s]}`} />}
              {label(s)}
              <span className="opacity-70" dir="ltr">{counts[s || 'all'] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {orders === null ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : orders.length === 0 ? (
        <p className="text-center text-gray-400 py-16">{t('orders.empty')}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {orders.map((o) => <OrderCard key={o.id} order={o} canManage={can('order.manage')} onStatus={setSheet} />)}
          </div>
          {hasMore && (
            <button type="button" onClick={more} disabled={loadingMore}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 text-sm font-bold text-gray-600 dark:text-zinc-300">
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}{t('orders.more')}
            </button>
          )}
        </>
      )}

      {sheet && <StatusSheet order={sheet} onClose={() => setSheet(null)} onChanged={(s) => onChanged(sheet, s)} />}
    </div>
  );
}
