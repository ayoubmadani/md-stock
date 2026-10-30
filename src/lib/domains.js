// صفحة الدومين: سجل الربط (نفسه لكل الدومينات) وتبويبات القائمة

export const DNS_RECORD = [['type', 'CNAME'], ['host', '@'], ['value', 'mdstore.top'], ['ttl', 'Auto']];

const isSub = (d) => d.domain.endsWith('.mdstore.top');
const isPage = (d) => d.scope === 'landing_page';

/** روابط المتجر (*.mdstore.top)، الدومينات المخصصة (المنتظرة أولاً)، والمربوطة بصفحات هبوط */
export function groupDomains(list) {
  return {
    store: list.filter((d) => !isPage(d) && isSub(d)),
    custom: list.filter((d) => !isPage(d) && !isSub(d)).sort((a, b) => Number(!!a.isActive) - Number(!!b.isActive)),
    pages: list.filter(isPage),
  };
}

/** بحث في الدومين أو اسم صفحة الهبوط المربوطة */
export function filterDomains(list, q, pages = []) {
  const s = String(q ?? '').trim().toLowerCase();
  if (!s) return list;
  const name = (d) => d.builderPage?.name ?? pages.find((p) => p.id === d.builderPageId)?.name ?? '';
  return list.filter((d) => d.domain.toLowerCase().includes(s) || name(d).toLowerCase().includes(s));
}

const SUFFIX = '.mdstore.top';

/** إكمال رابط فرعي: «promo» أو «promo.mdst» ← promo.mdstore.top؛ لا اقتراح لدومين كامل (bebe.com) */
export function suggestSubdomain(raw) {
  const v = String(raw ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!v || v.endsWith(SUFFIX)) return null;
  const dot = v.indexOf('.');
  const rest = dot < 0 ? '' : v.slice(dot);
  // بعد النقطة: إما لا شيء، أو بداية «.mdstore.top» — غير ذلك دومين مخصص
  if (rest && !SUFFIX.startsWith(rest)) return null;
  const name = (dot < 0 ? v : v.slice(0, dot)).replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return name ? name + SUFFIX : null;
}
