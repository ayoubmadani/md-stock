// منطق صفحتي التصنيفات والدومين

/** الشجرة ← قائمة مسطّحة مع العمق (الأب قبل أبنائه) */
export const flattenTree = (list, level = 0) =>
  (list || []).flatMap((c) => [{ ...c, level }, ...flattenTree(c.children, level + 1)]);

/** التصنيفات التي يمكن أن تكون أباً: لا التصنيف نفسه ولا أحد فروعه (يمنع الحلقة) */
export function parentOptions(tree, selfId) {
  const skip = (list) => (list || []).flatMap((c) => (c.id === selfId ? [] : [{ ...c, children: skip(c.children) }]));
  return flattenTree(selfId ? skip(tree) : tree);
}

/** «https://Shop.example.com/x» ← «shop.example.com»؛ null إن لم يكن دوميناً */
export function normalizeDomain(raw) {
  let v = String(raw || '').trim().toLowerCase();
  v = v.replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.$/, '');
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(v) ? v : null;
}
