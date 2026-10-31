// الحسابات المحفوظة على هذا الهاتف: تبديل بلا كلمة سر، إضافة حساب دون الخروج، إزالة من الهاتف
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Check, Plus, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { canAddAccount, MAX_ACCOUNTS } from '../lib/accounts';

export function Avatar({ account, size = 'w-9 h-9' }) {
  const letter = (account?.name || account?.email || '?').trim().charAt(0).toUpperCase();
  return account?.image
    ? <img src={account.image} alt="" className={`${size} rounded-full object-cover shrink-0`} />
    : <span className={`${size} rounded-full shrink-0 grid place-items-center bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-bold text-sm`}>{letter}</span>;
}

function Row({ account, current, onPick, onForget }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button type="button" onClick={onPick} disabled={current} className="flex-1 min-w-0 flex items-center gap-3 text-start disabled:cursor-default">
        <Avatar account={account} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-sm truncate">{account.name || account.email}</span>
          <span className="block text-xs text-gray-400 truncate"><bdi dir="ltr">{account.email}</bdi></span>
          {account.expired && <span className="block text-xs font-semibold text-amber-600">{t('accounts.relogin')}</span>}
        </span>
        {current && <Check className="w-5 h-5 text-indigo-500 shrink-0" aria-label={t('accounts.current')} />}
      </button>
      {!current && onForget && (
        <button type="button" onClick={onForget} title={t('accounts.remove')} aria-label={t('accounts.remove')}
          className="w-8 h-8 shrink-0 grid place-items-center rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/** «المزيد»: الحساب الحالي + الحسابات الأخرى + إضافة حساب */
export function AccountsCard() {
  const { t } = useTranslation();
  const { accounts, currentAccountId, switchAccount, forgetAccount } = useAuth();
  if (!accounts.length) return null;
  const sorted = [...accounts].sort((a, b) => (b.id === currentAccountId) - (a.id === currentAccountId));
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80">
      <p className="px-4 pt-3 text-xs font-bold text-gray-400">{t('accounts.title')}</p>
      <div className="divide-y divide-gray-100 dark:divide-zinc-800">
        {sorted.map((a) => (
          <Row key={a.id} account={a} current={a.id === currentAccountId}
            onPick={() => (a.expired ? window.location.assign(`/login?add=1&email=${encodeURIComponent(a.email)}`) : switchAccount(a.id))}
            onForget={() => window.confirm(t('accounts.remove_confirm', { email: a.email })) && forgetAccount(a.id)} />
        ))}
        {canAddAccount(accounts) ? (
          <Link to="/login?add=1" className="flex items-center gap-3 px-4 py-3 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <span className="w-9 h-9 rounded-full grid place-items-center border border-dashed border-current"><Plus className="w-4 h-4" /></span>
            {t('accounts.add')}
          </Link>
        ) : (
          <p className="px-4 py-3 text-xs text-gray-400">{t('accounts.limit', { n: MAX_ACCOUNTS })}</p>
        )}
      </div>
    </div>
  );
}

/** صفحة الدخول: حسابات محفوظة للرجوع إليها بضغطة (المنتهية تملأ البريد فقط) */
export function SavedAccounts({ onPickExpired }) {
  const { t } = useTranslation();
  const { accounts, currentAccountId, switchAccount } = useAuth();
  if (!accounts.length) return null;
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80">
      <p className="px-4 pt-3 text-xs font-bold text-gray-400">{t('accounts.saved')}</p>
      <div className="divide-y divide-gray-100 dark:divide-zinc-800">
        {accounts.map((a) => (
          <Row key={a.id} account={a} current={false}
            onPick={() => (a.expired ? onPickExpired(a.email) : a.id === currentAccountId ? window.location.assign('/') : switchAccount(a.id))} />
        ))}
      </div>
    </div>
  );
}
