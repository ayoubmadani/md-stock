// يُخفي صفحة عن عضو ليست له صلاحيتها
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function RequirePerm({ perm, children }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  if (can(perm)) return children;
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-gray-400">
      <Lock className="w-8 h-8" />
      <p className="text-sm max-w-xs">{t('no_permission')}</p>
    </div>
  );
}
