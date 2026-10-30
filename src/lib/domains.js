// صفحة الدومين: سجل الربط (نفسه لكل الدومينات) وتقسيم القائمة

export const DNS_RECORD = [['type', 'CNAME'], ['host', '@'], ['value', 'mdstore.top'], ['ttl', 'Auto']];

// رابط المتجر نفسه: *.mdstore.top وليس لصفحة هبوط (روابط صفحات الهبوط تُحذف مثل الدومينات المخصصة)
const isStoreLink = (d) => d.domain.endsWith('.mdstore.top') && d.scope !== 'landing_page';

/** رابط المتجر وحده، والبقية تحته (دومينات مخصصة وروابط صفحات الهبوط) — المنتظرة أولاً */
export function splitDomains(list) {
  const system = list.filter(isStoreLink);
  const custom = list.filter((d) => !isStoreLink(d)).sort((a, b) => Number(!!a.isActive) - Number(!!b.isActive));
  return { system, custom };
}
