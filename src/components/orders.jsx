// عناصر مشتركة لصفحات الطلبات: شارة الحالة، نافذة تغيير الحالة، والوقت النسبي
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Lock, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { STATUS_CLS, STATUS_DOT, allowedStatuses, statusPayload } from '../lib/orders';

export const statusLabel = (t, status, isDigital) =>
  status === 'delivered' && isDigital ? t('orders.status.delivered_digital') : t(`orders.status.${status}`);

export function OrderStatusBadge({ order, onClick }) {
  const { t } = useTranslation();
  const cls = `inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${STATUS_CLS[order.status] || STATUS_CLS.pending}`;
  const label = statusLabel(t, order.status, order.isDigital);
  return onClick
    ? <button type="button" onClick={onClick} className={cls}>{label}</button>
    : <span className={cls}>{label}</span>;
}

/** «منذ 5 د» بلغة الواجهة */
export function timeAgo(date, lang) {
  const sec = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' });
  const steps = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']];
  let v = sec;
  for (const [n, unit] of steps) {
    if (Math.abs(v) < n) return rtf.format(Math.round(v), unit);
    v /= n;
  }
  return '';
}

/** نافذة من الأسفل لاختيار حالة جديدة؛ تحفظ ثم تُرجع الحالة الجديدة */
export function StatusSheet({ order, onClose, onChanged }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(null);
  const options = allowedStatuses(order);

  const pick = async (status) => {
    if (status === order.status) return onClose();
    setBusy(status);
    try {
      await api.patch(`/orders/${order.id}`, statusPayload(order, status));
      toast.success(`${order.customerName || ''} ← ${statusLabel(t, status, order.isDigital)}`);
      onChanged(status);
    } catch (e) {
      toast.error(errorMessage(e, t('orders.save_failed')));
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-bold">{t('orders.change_status')}</p>
            <p className="text-xs text-gray-400 truncate"><bdi>{order.customerName}</bdi></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        {options.length === 0 ? (
          <p className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 dark:bg-zinc-950 rounded-xl p-3">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />{t('orders.locked', { name: order.confirmationCompany?.name || '' })}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {options.map((s) => (
              <button key={s} type="button" disabled={!!busy} onClick={() => pick(s)}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-semibold text-start disabled:opacity-60 ${
                  s === order.status ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-100 dark:border-zinc-800'}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[s]}`} />
                <span className="flex-1 truncate">{statusLabel(t, s, order.isDigital)}</span>
                {busy === s ? <Loader2 className="w-4 h-4 animate-spin" /> : s === order.status && <Check className="w-4 h-4 text-indigo-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
