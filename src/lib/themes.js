// الثيمات: الاسم حسب لغة الواجهة، وحالة الثيم بالنسبة للمتجر

export const themeName = (th, lang) => th?.[`name_${lang === 'ar' || lang === 'fr' ? lang : 'en'}`] || th?.name_en || '';

/** active: مفعّل على المتجر — installed: في ثيماتي — plan: ضمن الاشتراك — free / paid: للتثبيت */
export function themeStatus(th, { activeId, myIds = [], planIds = [] }) {
  if (th.id === activeId) return 'active';
  if (myIds.includes(th.id)) return 'installed';
  if (planIds.includes(th.id)) return 'plan';
  return Number(th.price) > 0 ? 'paid' : 'free';
}
