// صفحات الهبوط: نسبة التحويل ورابط المعاينة ورابط المحرر (التصميم نفسه في اللوحة على الكمبيوتر)

export const pageCr = (p) => (p.showsCount > 0 ? ((p.ordersCount / p.showsCount) * 100).toFixed(1) : '0');

export function pageUrl(p) {
  const d = p.domains?.[0] || p.domain;
  return d ? `https://${d}` : null;
}

export const editorUrl = (id) => `https://app.mdstore.top/editor/${id}`;
