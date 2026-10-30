// صفحة الدومين: سجل الربط (نفسه لكل الدومينات) وتقسيم القائمة

export const DNS_RECORD = [['type', 'CNAME'], ['host', '@'], ['value', 'mdstore.top'], ['ttl', 'Auto']];

/** رابط المتجر (*.mdstore.top) وحده، والدومينات المخصصة تحته — المنتظرة أولاً */
export function splitDomains(list) {
  const system = list.filter((d) => d.domain.endsWith('.mdstore.top'));
  const custom = list.filter((d) => !d.domain.endsWith('.mdstore.top')).sort((a, b) => Number(!!a.isActive) - Number(!!b.isActive));
  return { system, custom };
}
