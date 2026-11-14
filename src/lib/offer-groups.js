// صفحة الطلب: سطور نفس المنتج ونفس العرض تظهر في صندوق واحد — اسم العرض، سعره، المنتج، وخيارات القطع.
// الطلب نفسه لا يتغيّر (سطور كطلب السلة)؛ هذا تجميع للعرض فقط.

/** الخيارات كنص: «L · ازرق» */
export const partsLabel = (parts) => (Array.isArray(parts) ? parts.map((p) => p?.value).filter(Boolean).join(' · ') : '');

const lineTotal = (it) =>
  Number(it.finalPrice || 0) * Number(it.quantity || 1) +
  (it.addons || []).reduce((s, a) => s + (a.separate ? Number(a.price || 0) * Number(a.qty || 1) : 0), 0);

/** [{ type: 'offer', key, offer, product, items, pieces, boxes, total } | { type: 'item', item }] بترتيب الظهور */
export function groupOfferItems(items = []) {
  const out = [];
  const byKey = new Map();
  for (const it of items) {
    const offer = it.offer;
    if (!offer || !it.productId) { out.push({ type: 'item', item: it }); continue; }
    const key = `${it.productId}|${offer.id ?? it.offerId}`;
    let g = byKey.get(key);
    if (!g) {
      g = { type: 'offer', key, offer, product: it.product, items: [], pieces: 0, boxes: 0, total: 0 };
      byKey.set(key, g);
      out.push(g);
    }
    g.items.push(it);
    g.pieces += Number(it.quantity || 1);
    g.total += lineTotal(it);
  }
  for (const g of byKey.values()) g.boxes = Math.max(1, Math.ceil(g.pieces / Math.max(1, Number(g.offer.quantity) || 1)));
  return out;
}
// ── تعديل الطلب: بطاقة العرض قابلة للتعديل ──
// القطع = سطور العرض مفرودة (سطر بكمية 3 = 3 قطع). البطاقة = قطع العرض (offer.quantity) — الكمية = عدد البطاقات.

/** سطور العرض ← قطع (قطعة لكل وحدة من الكمية) */
export const expandPieces = (items = []) =>
  items.flatMap((it) => Array.from({ length: Math.max(1, Number(it.quantity) || 1) }, () => ({ ...it, quantity: 1 })));

/** عدد البطاقات count، كل بطاقة per قطعة: الإنقاص يحذف آخر بطاقة، والزيادة تنسخ آخر بطاقة */
export function resizePieces(pieces, count, per) {
  const k = Math.max(1, Math.floor(per) || 1);
  const want = Math.max(1, Math.floor(count) || 1) * k;
  const out = pieces.slice(0, want);
  // آخر بطاقة كاملة (أو ما تبقى) تُنسخ قطعةً قطعة
  const box = out.length >= k ? out.slice(out.length - k) : [...out];
  const start = out.length;
  while (out.length < want && box.length) out.push({ ...box[(out.length - start) % box.length] });
  return out;
}

/** سعر العرض مقسوماً على قطعه، الباقي على الأولى */
const split = (total, n) => {
  const each = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === 0 ? total - each * (n - 1) : each));
};
const perPieceAddons = (it) => (it.addons || []).reduce((s, a) => s + (a.separate ? 0 : Number(a.price || 0) * Number(a.qty || 1)), 0);

/** قطع ← سطور: سطر لكل قطعة بكمية 1، وسعرها نصيبها من سعر العرض (+ إضافاتها لكل قطعة) */
export function offerLines(pieces, offer, seen = new Set()) {
  const per = Math.max(1, Number(offer?.quantity) || 1);
  const shares = split(Number(offer?.price) || 0, per);
  return pieces.map((p, i) => {
    const id = !seen.has(p.id) && p.id ? p.id : `new-${Date.now()}-${i}`;
    seen.add(id);
    const finalPrice = shares[i % per] + perPieceAddons(p);
    return { ...p, id, quantity: 1, offerId: offer?.id, offer, finalPrice, itemTotal: finalPrice };
  });
}
