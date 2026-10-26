// ترتيب صور صفحة الصور: الأولى هي الرئيسية (تُزال خلفيتها وتصبح صورة المنتج في الصفحة)
export function movePhoto(list, from, to) {
  if (from === to || to < 0 || to >= list.length || from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
