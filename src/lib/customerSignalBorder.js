// إطار بطاقة الطلب حسب تنبيه «نفس الزبون» (أصناف كاملة حتى يجدها Tailwind)
export const SIGNAL_BORDER = {
  risk: 'border-2 border-rose-500',
  dup_open: 'border-2 border-orange-400',
  dup_progress: 'border-2 border-violet-400',
  caution: 'border-2 border-amber-300',
  trusted: 'border-2 border-emerald-400',
  previous: 'border-2 border-gray-300 dark:border-zinc-600',
  new: 'border border-sky-300 dark:border-sky-500/50',
};
/** '' بلا تنبيه ← الإطار العادي */
export const signalBorder = (s) => (s?.level ? SIGNAL_BORDER[s.level] || '' : '');
