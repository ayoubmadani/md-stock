// يُخفي صفحة عن عضو ليست له صلاحيتها
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';

/** perm: صلاحية واحدة أو قائمة (يكفي واحدة منها)؛ owner: لصاحب المتجر فقط */
export default function RequirePerm({ perm, owner, children }) {
  const { t } = useTranslation();
  const { can, isOwner } = useAuth();
  if (owner ? isOwner : [].concat(perm).some((p) => can(p))) return children;
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-gray-400">
      <Lock className="w-8 h-8" />
      <p className="text-sm max-w-xs">{t('no_permission')}</p>
    </div>
  );
}
