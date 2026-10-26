// «المزيد» على الهاتف: بقية الأقسام حسب صلاحيات العضو
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Bell, BellRing, Code2, Store, Palette, Crown, ChevronLeft, LogOut, Megaphone, ShoppingCart, TrendingUp, Volume2, Wallet, FolderTree, Globe, History, Loader2, Share } from 'lucide-react';
import { disablePush, enablePush, isIos, isStandalone, pushState } from '../lib/push';
import { playCoin } from '../lib/coin';
import { Toggle } from '../components/product';
import { useAuth } from '../lib/auth';

export const MORE = [
  { to: '/abandoned', key: 'abandoned', icon: ShoppingCart, perm: 'order.view' },
  { to: '/profit', key: 'profit', icon: TrendingUp, perm: 'product.crud' },
  { to: '/meta', key: 'meta', icon: Megaphone, perm: 'product.crud' },
  { to: '/stores', key: 'stores', icon: Store, all: true },
  { to: '/themes', key: 'themes', icon: Palette, owner: true },
  { to: '/pixels', key: 'pixels', icon: Code2, owner: true },
  { to: '/subscription', key: 'subscription', icon: Crown, owner: true },
  { to: '/wallet', key: 'wallet', icon: Wallet, owner: true },
  { to: '/alerts', key: 'alerts', icon: BellRing, perm: 'product.crud' },
  { to: '/history', key: 'history', icon: History, perm: 'product.crud' },
  { to: '/categories', key: 'categories', icon: FolderTree, perm: 'category.crud' },
  { to: '/domains', key: 'domains', icon: Globe, perm: 'domain.crud' },
];

// تفعيل إشعار «طلب جديد» على هذا الهاتف
function PushCard() {
  const { t } = useTranslation();
  const [state, setState] = useState(null); // on | off | denied | unsupported
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushState().then(setState); }, []);

  const toggle = async (on) => {
    setBusy(true);
    try {
      const next = on ? await enablePush() : await disablePush();
      setState(next);
      if (next === 'on') toast.success(t('push.enabled'));
      if (next === 'denied') toast.error(t('push.denied'));
    } catch (e) {
      // السبب الحقيقي: شهادة غير موثوقة، إذن، أو خطأ الخادم
      const msg = e?.response?.data?.message || e?.message || '';
      toast.error(/ssl|certificate|security|insecure/i.test(msg) ? t('push.bad_cert') : `${t('push.failed')}${msg ? ` — ${msg}` : ''}`);
    } finally {
      setBusy(false);
    }
  };

  const iosNeedsInstall = isIos() && !isStandalone();
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4 space-y-2">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0"><Bell className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">{t('push.title')}</p>
          <p className="text-xs text-gray-400">{t('push.subtitle')}</p>
        </div>
        {state === null || busy ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          : (state === 'on' || state === 'off') && !iosNeedsInstall && <Toggle checked={state === 'on'} onChange={toggle} />}
      </div>
      <button type="button" onClick={playCoin} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
        <Volume2 className="w-4 h-4" />{t('push.test_sound')}
      </button>
      {iosNeedsInstall && <p className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded-xl p-3"><Share className="w-4 h-4 shrink-0" />{t('push.ios_install')}</p>}
      {!iosNeedsInstall && state === 'unsupported' && <p className="text-xs text-gray-500">{t('push.unsupported')}</p>}
      {state === 'denied' && <p className="text-xs text-rose-500">{t('push.denied')}</p>}
    </div>
  );
}

export default function MorePage() {
  const { t } = useTranslation();
  const { can, stores, logout } = useAuth();
  const owner = stores.some((s) => s.role === 'owner');
  return (
    <div className="max-w-xl mx-auto space-y-3">
    {can('order.view') && <PushCard />}
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800">
      {MORE.filter((m) => m.all || (m.owner ? owner : can(m.perm))).map((m) => (
        <Link key={m.to} to={m.to} className="flex items-center gap-3 px-4 py-3.5">
          <m.icon className="w-5 h-5 text-gray-400" />
          <span className="flex-1 font-semibold text-sm">{t(`nav.${m.key}`)}</span>
          <ChevronLeft className="w-4 h-4 text-gray-300 ltr:rotate-180" />
        </Link>
      ))}
    </div>
    <button type="button" onClick={() => window.confirm(t('logout_confirm')) && logout()}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 text-rose-500 font-bold text-sm">
      <LogOut className="w-5 h-5" />{t('logout')}
    </button>
    </div>
  );
}
