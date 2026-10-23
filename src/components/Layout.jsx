import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Boxes, History, BellRing, LogOut, Languages, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/', key: 'home', icon: Home, end: true },
  { to: '/stock', key: 'stock', icon: Boxes },
  { to: '/alerts', key: 'alerts', icon: BellRing },
  { to: '/history', key: 'history', icon: History },
];
const LANGS = ['ar', 'fr', 'en'];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { stores, storeId, selectStore, logout } = useAuth();
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
          <img src="/icon.svg" alt="" className="w-8 h-8" />
          <span className="font-bold">{t('app_name')}</span>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={navCls}><n.icon className="w-5 h-5" />{t(`nav.${n.key}`)}</NavLink>
        ))}
      </aside>

      <div className="flex-1 min-w-0 pb-20 md:pb-0">
        {/* الشريط العلوي */}
        <header className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-gray-50/90 dark:bg-zinc-950/90 backdrop-blur border-b border-gray-100 dark:border-zinc-900">
          <img src="/icon.svg" alt="" className="w-7 h-7 md:hidden" />
          <select value={storeId || ''} onChange={(e) => selectStore(e.target.value)}
            className="flex-1 min-w-0 md:flex-none md:w-64 px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-semibold outline-none">
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex-1 hidden md:block" />
          <button onClick={nextLang} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-900 flex items-center gap-1 text-xs font-bold uppercase" title="Language">
            <Languages className="w-4 h-4" />{i18n.language}
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-900">{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
          <button onClick={logout} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-900" title={t('logout')}><LogOut className="w-4 h-4" /></button>
        </header>

        <main className="p-4 md:p-6 max-w-6xl mx-auto">
          <Outlet />
        </main>
      </div>

      {/* شريط سفلي على الهاتف */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-t border-gray-100 dark:border-zinc-900 pb-[env(safe-area-inset-bottom)]">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={navCls}><n.icon className="w-5 h-5" />{t(`nav.${n.key}`)}</NavLink>
        ))}
      </nav>
    </div>
  );
}
