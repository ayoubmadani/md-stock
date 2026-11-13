// حصة طلبات الخطة: العدّاد، الدين، والطلبات المخفية — الدفع بموافقة التاجر فقط (زر + تأكيد)
// compact: شريط لصفحة الطلبات (يظهر فقط إن وُجد دين أو مخفي)
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Lock, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';

const Q = '/subscription/my/order-quota';

// reloadKey: يتغير ← يُعاد التحميل (مع تحميل قائمة الطلبات)
export default function OrderQuotaCard({ compact = false, onChanged, reloadKey = 0 }) {
  const { t } = useTranslation();
  const [u, setU] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = useCallback(() => { api.get(Q).then((r) => setU(r.data)).catch(() => setU(null)); }, []);
  useEffect(() => { load(); }, [load, reloadKey]);

  const act = async (key, path, body, text) => {
    if (!window.confirm(text)) return;
    setBusy(key);
    try { await api.post(`${Q}/${path}`, body ?? {}); load(); onChanged?.(); } catch (e) { toast.error(errorMessage(e, t('quota.error'))); } finally { setBusy(null); }
  };

  if (!u) return null;
  const unlimited = u.limit < 0;
  const hidden = (u.hidden?.current || 0) + (u.hidden?.old || 0);
  // صفحة الطلبات: تظهر لكل خطة بحصة (لشرح طلب التجربة)، أو عند وجود دين/مخفي
  if (compact && unlimited && !u.debt && !hidden) return null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((u.used / Math.max(1, u.limit)) * 100));
  const btn = 'shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50';
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${hidden ? 'border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5' : 'bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800/80'}`}>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">{hidden ? <Lock className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{t('quota.title')}</p>
          <p className="text-xs text-gray-500">{unlimited ? t('quota.unlimited') : t('quota.used', { used: u.used, limit: u.limit })}{!unlimited && u.fee > 0 ? ` — ${t('quota.fee', { fee: u.fee })}` : ''}</p>
        </div>
      </div>
      {!unlimited && !compact && (
        <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {u.debt > 0 && (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs font-semibold text-amber-700 dark:text-amber-300">{t(u.oldDebt ? 'quota.debt_old' : 'quota.debt', { debt: u.debt, max: u.maxDebt })}</p>
          <button type="button" disabled={!!busy} onClick={() => act('debt', 'pay-debt', null, t('quota.confirm_debt', { amount: u.debt, balance: u.balance }))} className={`${btn} bg-amber-500 text-white`}>
            {busy === 'debt' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{t('quota.pay_debt', { amount: u.debt })}
          </button>
        </div>
      )}
      {u.hidden?.current > 0 && (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs font-semibold text-rose-600">{t('quota.hidden_current', { count: u.hidden.current })}</p>
          <button type="button" disabled={!!busy} onClick={() => act('cur', 'reveal', { scope: 'current' }, t('quota.confirm_reveal', { count: u.hidden.current, amount: u.hidden.currentCost, balance: u.balance }))} className={`${btn} bg-rose-600 text-white`}>
            {busy === 'cur' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{t('quota.reveal', { amount: u.hidden.currentCost })}
          </button>
        </div>
      )}
      {u.hidden?.old > 0 && (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs font-semibold text-gray-600 dark:text-zinc-300">{t('quota.hidden_old', { count: u.hidden.old })}</p>
          <button type="button" disabled={!!busy} onClick={() => act('old', 'reveal', { scope: 'old' }, t('quota.confirm_reveal', { count: u.hidden.old, amount: u.hidden.oldCost, balance: u.balance }))} className={`${btn} border border-gray-300 dark:border-zinc-700`}>
            {busy === 'old' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{t('quota.reveal', { amount: u.hidden.oldCost })}
          </button>
        </div>
      )}
      {hidden > 0 && <p className="text-[11px] text-gray-500">{t('quota.balance', { balance: u.balance })}</p>}
      {compact && !unlimited && (
        <p className="text-[11px] text-gray-500 border-t border-gray-100 dark:border-zinc-800 pt-2">🧪 <span dangerouslySetInnerHTML={{ __html: t('quota.test_hint') }} /></p>
      )}
    </div>
  );
}
