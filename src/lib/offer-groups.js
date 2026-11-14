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
