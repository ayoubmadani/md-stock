// «المزيد» على الهاتف: بقية الأقسام حسب صلاحيات العضو
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BellRing, ChevronLeft, History } from 'lucide-react';
import { useAuth } from '../lib/auth';

export const MORE = [
  { to: '/alerts', key: 'alerts', icon: BellRing, perm: 'product.crud' },
  { to: '/history', key: 'history', icon: History, perm: 'product.crud' },
];

export default function MorePage() {
  const { t } = useTranslation();
  const { can } = useAuth();
  return (
    <div className="max-w-xl mx-auto rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800">
      {MORE.filter((m) => can(m.perm)).map((m) => (
        <Link key={m.to} to={m.to} className="flex items-center gap-3 px-4 py-3.5">
          <m.icon className="w-5 h-5 text-gray-400" />
          <span className="flex-1 font-semibold text-sm">{t(`nav.${m.key}`)}</span>
          <ChevronLeft className="w-4 h-4 text-gray-300 ltr:rotate-180" />
        </Link>
      ))}
    </div>
  );
}
