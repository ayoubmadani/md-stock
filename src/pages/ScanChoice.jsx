// زر المسح (الأسفل) ← هذه الصفحة: «طلب» (بيع في المحل) أو «معلومات» (منتج أو طلب)
// خيار واحد مسموح للعضو ← يُفتح مباشرة
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleHelp, ShoppingCart } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { scanChoices } from '../lib/scan-menu';

const ICONS = { order: ShoppingCart, info: CircleHelp };

export default function ScanChoice() {
  const { t } = useTranslation();
  const { can } = useAuth();
  const choices = scanChoices(can);
  if (choices.length === 1) return <Navigate to={choices[0].to} replace />;
  return (
    <div className="max-w-md mx-auto grid grid-cols-2 gap-3 pt-[12vh]">
      {choices.map((c) => {
        const Icon = ICONS[c.key];
        return (
          <Link key={c.key} to={c.to}
            className="aspect-square flex flex-col items-center justify-center gap-3 rounded-3xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 active:scale-[.98] transition-transform">
            <span className="w-16 h-16 rounded-2xl grid place-items-center bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon className="w-8 h-8" /></span>
            <span className="text-lg font-bold">{t(`nav.scan_${c.key}`)}</span>
          </Link>
        );
      })}
    </div>
  );
}
