import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // رجوع من Google بخطأ (مثلاً حساب غير موجود)
  const [error, setError] = useState(() => {
    const e = new URLSearchParams(window.location.search).get('error');
    return e === 'no_account' ? t('login.no_account') : e ? t('login.google_error') : null;
  });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email: email.trim(), password });
      if (data?.message === 'ACCOUNT_NOT_VERIFIED' || !data?.access_token) {
        setError(t('login.not_verified'));
      } else {
        login(data.access_token);
        window.location.assign('/');
      }
    } catch (err) {
      // لا رد من الخادم ≠ كلمة سر خاطئة
      setError(err?.response ? t('login.error') : t('login.network'));
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400';
  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <img src="/icon-192.png" alt="" className="w-14 h-14 rounded-2xl mx-auto" />
          <h1 className="text-2xl font-bold">{t('login.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">{t('login.subtitle')}</p>
        </div>
        <input type="email" dir="ltr" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('login.email')} className={input} />
        <input type="password" dir="ltr" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('login.password')} className={input} />
        {error && <p className="text-sm text-rose-500 text-center">{error}</p>}
        <button disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-60">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('login.submit')}
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />{t('login.or')}<span className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
        </div>

        {/* نفس حساب Google في لوحة التاجر — الرجوع برمز لمرة واحدة عبر /handoff */}
        <a href={`${import.meta.env.VITE_API_URL}/auth/stock/google`}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-zinc-800">
          <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
          {t('login.google')}
        </a>
      </form>
    </div>
  );
}
