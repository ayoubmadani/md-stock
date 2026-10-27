import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Boxes, LogOut, Languages, Sun, Moon, ScanLine, ShoppingBag, LayoutGrid, ChevronDown, Store, ScanBarcode } from 'lucide-react';
import { MORE } from '../pages/More';
import { useState } from 'react';
import { useAuth } from '../lib/auth';
import TrialOffer from './TrialOffer';

// الشريط السفلي: 5 أزرار ثابتة؛ ما لا صلاحية له يظهر باهتاً ويفتح رسالة «لا صلاحية»
const NAV = [
  { to: '/', key: 'home', icon: Home, end: true },
  { to: '/orders', key: 'orders', icon: ShoppingBag, perm: 'order.view' },
  { to: '/scan', key: 'scan', icon: ScanLine, primary: true, perm: ['product.crud', 'order.view'] },
  { to: '/stock', key: 'stock', icon: Boxes, perm: 'product.crud' },
  { to: '/more', key: 'more', icon: LayoutGrid, mobileOnly: true },
];
const LANGS = ['ar', 'fr', 'en'];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { stores, store, logout, can } = useAuth();
  const owner = stores.some((s) => s.role === 'owner');
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('stock_theme', next ? 'dark' : 'light'); } catch { /* وضع خاص */ }
    setDark(next);
  };
  const nextLang = () => i18n.changeLanguage(LANGS[(LANGS.indexOf(i18n.language) + 1) % LANGS.length]);

  const navCls = ({ isActive }) =>
    `flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 py-2 md:py-2.5 rounded-xl text-[11px] md:text-sm font-semibold transition-colors ${
      isActive ? 'text-indigo-600 dark:text-indigo-400 md:bg-indigo-50 md:dark:bg-indigo-500/10' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
    }`;

  return (
    <div className="min-h-dvh md:flex">
      {/* جانبي على الحاسوب */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-e border-gray-100 dark:border-zinc-900 p-4 gap-1 sticky top-0 h-dvh">
        <div className="flex items-center gap-2 px-2 pb-4">
          <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-lg" />
          <span className="font-bold">{t('app_name')}</span>
        </div>
        {[...NAV.filter((n) => !n.mobileOnly), ...MORE].filter((n) => (n.owner ? owner : !n.perm || [].concat(n.perm).some((x) => can(x)))).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={navCls}><n.icon className="w-5 h-5" />{t(`nav.${n.key}`)}</NavLink>
        ))}
        <div className="flex-1" />
        <button type="button" onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
          <LogOut className="w-5 h-5" />{t('logout')}
        </button>
      </aside>

      <div className="flex-1 min-w-0 pb-20 md:pb-0">
        {/* الشريط العلوي */}
        <header className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-gray-50/90 dark:bg-zinc-950/90 backdrop-blur border-b border-gray-100 dark:border-zinc-900">
          <img src="/icon-192.png" alt="" className="w-7 h-7 rounded-lg md:hidden" />
          {/* المتجر الحالي — اختيار متجر آخر من صفحة «متاجري» */}
          <Link to="/stores" className="flex-1 min-w-0 md:flex-none md:max-w-xs flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-900">
            <span className="w-7 h-7 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shrink-0 flex items-center justify-center">
              {store?.design?.logoUrl ? <img src={store.design.logoUrl} alt="" className="w-full h-full object-contain" /> : <Store className="w-4 h-4 text-gray-400" />}
            </span>
            <span className="min-w-0 truncate text-sm font-bold"><bdi>{store?.name || '—'}</bdi></span>
            {stores.length > 1 && <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
          </Link>
          <div className="flex-1 hidden md:block" />
          {/* بيع في المحل — ظاهر في كل الصفحات */}
          {can('order.manage') && (
            <NavLink to="/pos" className={({ isActive }) => `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 ${isActive ? 'bg-emerald-700 text-white' : 'bg-emerald-600 text-white'}`}>
              <ScanBarcode className="w-4 h-4" /><span>{t('nav.pos_short')}</span>
            </NavLink>
          )}
          <button onClick={nextLang} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-900 flex items-center gap-1 text-xs font-bold uppercase" title="Language">
            <Languages className="w-4 h-4" />{i18n.language}
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-900">{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
        </header>

        <main className="p-4 md:p-6 max-w-6xl mx-auto">
          <Outlet />
        </main>
        {/* أول دخول لحساب جديد: تجربة مجانية للخطة */}
        <TrialOffer />
      </div>

      {/* شريط سفلي على الهاتف */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-5 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-t border-gray-100 dark:border-zinc-900 pb-[env(safe-area-inset-bottom)]">
        {NAV.map((n) => n.primary ? (
          <NavLink key={n.to} to={n.to} className="flex flex-col items-center justify-center -mt-5">
            <span className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30"><n.icon className="w-6 h-6" /></span>
          </NavLink>
        ) : (
          <NavLink key={n.to} to={n.to} end={n.end} className={(a) => `${navCls(a)} ${n.perm && ![].concat(n.perm).some((x) => can(x)) ? 'opacity-40' : ''}`}><n.icon className="w-5 h-5" />{t(`nav.${n.key}`)}</NavLink>
        ))}
      </nav>
    </div>
  );
}
