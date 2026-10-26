// بيع في المحل: سلة الأسطر الممسوحة (منتج / نسخة)، تعديل الكمية والسعر، وجسم الطلب

const keyOf = (hit) => (hit.variant ? `${hit.product.id}:${hit.variant.id}` : hit.product.id);

/** مسح منتج: نفس السطر +1 (ويصعد للأعلى)، وإلا سطر جديد في الأعلى */
export function addScanned(cart, hit) {
  const key = keyOf(hit);
  const found = cart.find((l) => l.key === key);
  if (found) return [{ ...found, quantity: found.quantity + 1 }, ...cart.filter((l) => l.key !== key)];
  return [{
    key, productId: hit.product.id, variantId: hit.variant?.id, name: hit.product.name, image: hit.product.image ?? null,
    parts: hit.variant?.parts ?? [], price: Number(hit.variant?.price ?? hit.product.price ?? 0), quantity: 1,
  }, ...cart];
}

export const setLine = (cart, key, patch) => cart
  .map((l) => (l.key === key ? { ...l, ...patch } : l))
  .filter((l) => l.quantity > 0);

export const cartTotal = (cart) => cart.reduce((s, l) => s + Number(l.price || 0) * l.quantity, 0);

/** ترتيب الأسطر كما مُسحت أولاً (الأقدم أولاً) في الطلب */
export const saleBody = (cart, { name, phone }) => ({
  items: [...cart].reverse().map((l) => ({ productId: l.productId, variantDetailId: l.variantId, quantity: l.quantity, finalPrice: Number(l.price || 0) })),
  customerName: name?.trim() || undefined,
  customerPhone: phone?.trim() || undefined,
});
