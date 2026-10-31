// الملف الشخصي (من «المزيد»): الحساب الحالي، الحسابات على هذا الهاتف، تغيير كلمة السر
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { hasPassword, MIN_PASSWORD, passwordBody, passwordFormError } from '../lib/profile';
import { AccountsCard, Avatar } from '../components/Accounts';

const input = 'w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400';
const card = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80';

function PasswordCard({ provider, onChanged }) {
  const { t } = useTranslation();
  const withCurrent = hasPassword(provider);
  const empty = { current: '', next: '', confirm: '' };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const err = passwordFormError(form, withCurrent);
    setError(err ? t(`profile.err_${err}`, { n: MIN_PASSWORD }) : null);
    if (err) return;
    setSaving(true);
    try {
      await api.patch('/user/password', passwordBody(form, withCurrent));
      toast.success(withCurrent ? t('profile.password_changed') : t('profile.password_set'));
      setForm(empty);
      onChanged();
    } catch (ex) {
      const msg = errorMessage(ex, t('inventory.error'));
      setError(/current password is incorrect/i.test(msg) ? t('profile.err_wrong_current') : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${card} p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-gray-400" />
        <p className="font-bold text-sm">{withCurrent ? t('profile.change_password') : t('profile.set_password')}</p>
      </div>
      {!withCurrent && <p className="text-xs text-gray-500 dark:text-zinc-400">{t('profile.google_hint')}</p>}
      {withCurrent && <input type="password" dir="ltr" autoComplete="current-password" value={form.current} onChange={set('current')} placeholder={t('profile.current')} className={input} />}
      <input type="password" dir="ltr" autoComplete="new-password" value={form.next} onChange={set('next')} placeholder={t('profile.new', { n: MIN_PASSWORD })} className={input} />
      <input type="password" dir="ltr" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} placeholder={t('profile.confirm')} className={input} />
      {error && <p className="text-sm text-rose-500">{error}</p>}
      <button disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-60">
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('profile.save_password')}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { accounts, currentAccountId } = useAuth();
  const saved = accounts.find((a) => a.id === currentAccountId);
  const [user, setUser] = useState(null);
  const load = () => api.get('/user/current-user').then(({ data }) => setUser(data)).catch(() => setUser({}));
  useEffect(() => { load(); }, []);
  const me = { name: user?.username || saved?.name, email: user?.email || saved?.email, image: user?.image ?? saved?.image };

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className={`${card} p-4 flex items-center gap-3`}>
        <Avatar account={me} size="w-14 h-14" />
        <div className="min-w-0">
          <p className="font-bold truncate">{me.name || '—'}</p>
          <p className="text-sm text-gray-400 truncate"><bdi dir="ltr">{me.email}</bdi></p>
        </div>
      </div>
      <AccountsCard />
      {user === null
        ? <div className={`${card} p-6 flex justify-center`}><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
        : <PasswordCard provider={user.provider} onChanged={load} />}
    </div>
  );
}
