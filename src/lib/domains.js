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
