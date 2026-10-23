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
  const [error, setError] = useState(null);

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
    } catch {
      setError(t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400';
  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <img src="/icon.svg" alt="" className="w-14 h-14 mx-auto" />
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
      </form>
    </div>
  );
}
