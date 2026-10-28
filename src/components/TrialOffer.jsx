// عند أول دخول لحساب جديد: الخطط مع «X أيام مجاناً» وسعر التجديد — التاجر يختار خطة التجربة (مثل اللوحة)
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { money } from '../lib/orders';
import { perMonth, planPrice } from '../lib/plans';
import { Features } from '../pages/Subscription';
import { useAuth } from '../lib/auth';
import { trialDismissKey } from '../lib/trial';


/** بلا props: يظهر تلقائياً أول دخول. مع data/onClose: يُفتح يدوياً (من صفحة الاشتراك لمن تخطّاه) */
export default function TrialOffer({ data: preset = null, onClose = null }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const DISMISS_KEY = trialDismissKey(token);
  const [offer, setOffer] = useState(preset);
  const [interval, setIv] = useState('month');
  const [autoRenew, setAutoRenew] = useState(true);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (preset) return;
    try { if (localStorage.getItem(DISMISS_KEY) === '1') return; } catch { /* وضع خاص */ }
    api.get('/subscription/trial').then(({ data }) => { if (data?.eligible && (data.plans?.length || data.freePlan)) setOffer(data); }).catch(() => {});
  }, [DISMISS_KEY, preset]);

  if (!offer) return null;

  const remember = () => { try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* وضع خاص */ } };
  const start = async (planId) => {
    setBusy(planId);
    try {
      await api.post('/subscription/trial', { planId, interval, autoRenew });
      remember();
      toast.success(t('sub.success'));
      // حدود الخطة الجديدة تُقرأ من جديد في كل الصفحات
      window.location.reload();
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); setBusy(null); }
  };

  // بديل التجربة: الخطة المجانية يفعّلها التاجر بنفسه
  const activateFree = async () => {
    setBusy(offer.freePlan.id);
    try {
      await api.post('/subscription/subscribe', { planId: offer.freePlan.id, interval: 'month' });
      remember();
      toast.success(t('sub.free_activated'));
      window.location.reload();
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); setBusy(null); }
  };

  const plans = offer.plans.filter((p) => planPrice(p, interval) > 0);
  const popularId = plans.length > 1 ? plans[Math.floor((plans.length - 1) / 2)]?.id : null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto p-5 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="text-center space-y-1.5">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500"><Gift className="w-6 h-6" /></span>
          <h2 className="text-xl font-black">{t('trial.title', { days: offer.days })}</h2>
          <p className="text-sm text-gray-500">{t('trial.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800">
          {['month', 'year'].map((iv) => (
            <button key={iv} type="button" onClick={() => setIv(iv)}
              className={`py-2 rounded-lg text-sm font-bold ${interval === iv ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'text-gray-500'}`}>{t(`sub.${iv}`)}</button>
          ))}
        </div>

        <div className="space-y-3">
          {plans.map((plan) => {
            const popular = plan.id === popularId;
            const price = planPrice(plan, interval);
            return (
              <div key={plan.id} className={`relative rounded-2xl border-2 p-4 space-y-3 ${popular ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-500/5' : 'border-gray-100 dark:border-zinc-800'}`}>
                {popular && <span className="absolute -top-3 start-4 inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-500 text-white text-[11px] font-black rounded-full"><Sparkles className="w-3 h-3" />{t('trial.popular')}</span>}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-lg capitalize">{plan.name}</p>
                    <p className="text-xs text-gray-500">{t('trial.then', { price: money(perMonth(price, interval)), currency: plan.currency || 'DZD' })}</p>
                    {interval === 'year' && <p className="text-[11px] text-gray-400">{t('sub.billed_yearly', { price: money(price), currency: plan.currency || 'DZD' })}</p>}
                  </div>
                  <p className="text-lg font-black text-emerald-500 shrink-0">{t('trial.free_days', { days: offer.days })}</p>
                </div>
                <Features f={plan.features} />
                <button type="button" disabled={!!busy} onClick={() => start(plan.id)}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm disabled:opacity-50 ${popular ? 'bg-indigo-600 text-white' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'}`}>
                  {busy === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}{t('trial.start')}
                </button>
              </div>
            );
          })}
        </div>

        {offer.freePlan && (
          <div className="rounded-2xl border-2 border-gray-100 dark:border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-lg capitalize">{offer.freePlan.name}</p>
              <p className="text-lg font-black text-emerald-500 shrink-0">{t('themes.free')}</p>
            </div>
            <Features f={offer.freePlan.features} />
            <button type="button" disabled={!!busy} onClick={activateFree}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 disabled:opacity-50">
              {busy === offer.freePlan.id && <Loader2 className="w-4 h-4 animate-spin" />}{t('sub.activate_free')}
            </button>
          </div>
        )}

        <label className="flex items-start gap-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/50 p-3.5">
          <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-600" />
          <span>
            <span className="block text-sm font-bold">{t('sub.auto_renew')}</span>
            <span className="block text-xs text-gray-400 mt-0.5">{t('trial.auto_renew_hint')}</span>
          </span>
        </label>

        <button type="button" onClick={() => { if (onClose) onClose(); else { remember(); setOffer(null); } }} className="w-full text-center text-sm font-semibold text-gray-400">{t('trial.skip')}</button>
      </div>
    </div>
  );
}
