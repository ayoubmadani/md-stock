// الاشتراك: الخطة الحالية (المدة، الأيام المتبقية، الحدود، التجديد التلقائي) + الاشتراك/الترقية من المحفظة مع كوبون
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Crown, Globe, Loader2, Package, Store, Tag, Users, Wallet, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { money } from '../lib/orders';
import { daysLeft, discounted, isFree, perMonth, planPrice, upgradeable, yearlySaving } from '../lib/plans';
import { Toggle, input } from '../components/product';

const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80';

function Features({ f }) {
  const { t } = useTranslation();
  if (!f) return null;
  const rows = [
    [Store, f.storeNumber, 'stores'], [Package, f.productNumber, 'products'], [Crown, f.landingPageNumber, 'pages'],
    [Globe, f.domainNumber, 'domains'], [Users, f.maxMembers, 'members'],
  ].filter(([, n]) => n);
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(([Icon, n, k]) => (
        <span key={k} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-zinc-300"><Icon className="w-3.5 h-3.5 text-indigo-500 shrink-0" /><b dir="ltr">{money(n)}</b> {t(`sub.f_${k}`)}</span>
      ))}
      {Number(f.commission) > 0 && <span className="text-xs text-amber-600 col-span-2">{t('sub.f_commission', { n: Number(f.commission) })}</span>}
    </div>
  );
}

// تأكيد الدفع من المحفظة
function ConfirmSheet({ plan, interval, coupon, code, upgrade, onClose, onDone }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const price = planPrice(plan, interval);
  const final = discounted(price, coupon);
  const pay = async () => {
    setBusy(true);
    try {
      await api.post(upgrade ? '/subscription/upgrade' : '/subscription/subscribe', { planId: plan.id, interval, couponCode: coupon ? code.trim() : undefined });
      toast.success(t('sub.success'));
      onDone();
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold capitalize">{plan.name} · {t(`sub.${interval}`)}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-3xl font-black" dir="ltr" style={{ textAlign: 'start' }}>
          {coupon && <span className="text-base text-gray-400 line-through me-2">{money(price)}</span>}{money(final)} <span className="text-sm">{plan.currency}</span>
        </p>
        <p className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed"><Wallet className="w-4 h-4 shrink-0 text-indigo-500" />{upgrade ? t('sub.upgrade_note') : t('sub.wallet_note')}</p>
        <button type="button" disabled={busy} onClick={pay} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}{upgrade ? t('sub.upgrade') : t('sub.subscribe')}
        </button>
        <Link to="/wallet" className="block text-center text-xs font-semibold text-indigo-600">{t('sub.top_up')}</Link>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { t, i18n } = useTranslation();
  const [sub, setSub] = useState(undefined);
  const [plans, setPlans] = useState([]);
  const [period, setPeriod] = useState('year');
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [checking, setChecking] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    api.get('/subscription/my').then((r) => setSub(r.data || null)).catch(() => setSub(null));
  }, []);
  useEffect(() => { load(); api.get('/plans', { params: { active: true } }).then((r) => setPlans(r.data ?? [])).catch(() => {}); }, [load]);

  const check = async () => {
    setChecking(true);
    try { const { data } = await api.post('/coupons/validate', { code: code.trim(), scope: 'plan' }); setCoupon(data); } catch (e) { setCoupon(null); toast.error(errorMessage(e, t('themes.coupon_invalid'))); } finally { setChecking(false); }
  };
  const autoRenew = async () => {
    const next = !sub.autoRenew;
    setSub((s) => ({ ...s, autoRenew: next }));
    try { await api.patch('/subscription/my/auto-renew', { autoRenew: next }); } catch (e) { setSub((s) => ({ ...s, autoRenew: !next })); toast.error(errorMessage(e, t('inventory.error'))); }
  };

  if (sub === undefined) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  const date = (d) => new Date(d).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' });
  const options = upgradeable(plans, sub).sort((a, b) => planPrice(a, 'month') - planPrice(b, 'month'));
  const left = sub ? daysLeft(sub.endDate) : 0;
  const total = sub ? Math.max(1, (new Date(sub.endDate) - new Date(sub.startDate)) / 86400000) : 1;

  return (
    <div className="max-w-xl mx-auto space-y-3">
      {/* الخطة الحالية */}
      {sub ? (
        <div className={`${box} p-4 space-y-3`}>
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0"><Crown className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg capitalize leading-tight">{sub.plan?.name}</p>
              <p className="text-xs text-gray-400">{sub.isTrial ? t('sub.trial') : t(`sub.${sub.interval}`)}</p>
            </div>
            <p className="text-end" dir="ltr">
              {isFree(sub.plan) ? <b className="text-emerald-600">{t('themes.free')}</b>
                : <><b className="text-lg">{money(perMonth(planPrice(sub.plan, sub.interval), sub.interval))}</b><span className="text-[11px] text-gray-400"> {sub.plan.currency}/{t('sub.mo')}</span></>}
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-gray-500"><CalendarDays className="w-3.5 h-3.5" />{date(sub.startDate)} → {date(sub.endDate)}</span>
              <b className={left <= 7 ? 'text-rose-600' : 'text-gray-700 dark:text-zinc-200'}>{t('sub.days_left', { count: left })}</b>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden"><div className={`h-full rounded-full ${left <= 7 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, (left / total) * 100)}%` }} /></div>
          </div>
          <Features f={sub.plan?.features} />
          {!isFree(sub.plan) && !sub.isTrial && <Toggle checked={!!sub.autoRenew} onChange={autoRenew}>{t('sub.auto_renew')}</Toggle>}
        </div>
      ) : (
        <div className={`${box} p-4 text-sm text-gray-500`}>{t('sub.none')}</div>
      )}

      {/* الاشتراك / الترقية */}
      {options.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 px-1 pt-2">{sub && !sub.isTrial ? t('sub.upgrade_title') : t('sub.choose')}</p>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900">
            {['month', 'year'].map((k) => (
              <button key={k} type="button" onClick={() => setPeriod(k)} className={`py-2 rounded-lg text-sm font-bold ${period === k ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-gray-500'}`}>
                {t(`sub.${k}`)}{k === 'year' && options.some((p) => yearlySaving(p) > 0) && <span dir="ltr" className="ms-1 text-[10px] text-emerald-600">−{Math.max(...options.map(yearlySaving))}%</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => { setCode(e.target.value); setCoupon(null); }} placeholder={t('themes.coupon')} dir="ltr" className={input} />
            <button type="button" disabled={!code.trim() || checking} onClick={check} className="px-4 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold disabled:opacity-50 flex items-center gap-1">
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}{t('themes.apply')}
            </button>
          </div>
          {coupon && <p className="text-xs font-semibold text-emerald-600 px-1">{t('sub.coupon_ok', { v: coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${money(coupon.discountValue)} DZD` })}</p>}
          {options.map((p) => {
            const price = planPrice(p, period);
            const final = discounted(price, coupon);
            return (
              <div key={p.id} className={`${box} p-4 space-y-3`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black capitalize">{p.name}</p>
                  <p className="text-end" dir="ltr">
                    {coupon && final !== price && <span className="text-xs text-gray-400 line-through me-1">{money(perMonth(price, period))}</span>}
                    <b className="text-lg">{money(perMonth(final, period))}</b><span className="text-[11px] text-gray-400"> {p.currency}/{t('sub.mo')}</span>
                  </p>
                </div>
                {period === 'year' && <p className="text-[11px] text-gray-400 -mt-2 text-end">{t('sub.billed_yearly', { price: money(final), currency: p.currency })}</p>}
                <Features f={p.features} />
                <button type="button" onClick={() => setConfirm(p)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                  <Zap className="w-4 h-4" />{sub && !sub.isTrial ? t('sub.upgrade') : t('sub.subscribe')}
                </button>
              </div>
            );
          })}
        </>
      )}

      {confirm && <ConfirmSheet plan={confirm} interval={period} coupon={coupon} code={code} upgrade={!!sub} onClose={() => setConfirm(null)} onDone={() => { setConfirm(null); setCode(''); setCoupon(null); load(); }} />}
    </div>
  );
}
