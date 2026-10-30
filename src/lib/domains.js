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
