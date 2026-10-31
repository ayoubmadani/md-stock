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
export const saleBody = (cart, { id, name, phone }, credit = null) => ({
  items: [...cart].reverse().map((l) => (l.service
    ? { title: l.name, cost: l.cost, quantity: l.quantity, finalPrice: Number(l.price || 0) }
    : { productId: l.productId, variantDetailId: l.variantId, quantity: l.quantity, finalPrice: Number(l.price || 0) })),
  customerName: name?.trim() || undefined,
  customerPhone: phone?.trim() || undefined,
  // زبون من جدول الزبائن: الخادم يأخذ اسمه وهاتفه منه
  ...(id ? { clientId: id } : {}),
  // دفع لاحقاً: الاسم إجباري، paidNow = العربون
  ...(credit?.payLater ? { payLater: true, paidNow: Number(credit.paidNow || 0) } : {}),
});

/** اختيار منتج بدل المسح: بحث في صفوف المخزون بالاسم أو الباركود أو اسم النسخة */
export function findPickable(products, q) {
  const s = String(q ?? '').trim().toLowerCase();
  if (!s) return products;
  const has = (v) => String(v ?? '').toLowerCase().includes(s);
  return products.filter((p) => has(p.name) || has(p.barcode) || (p.variants || []).some((v) => has(v.label) || has(v.barcode)));
}

/** منتج/نسخة مختارة ← نفس شكل نتيجة مسح الباركود (لـ addScanned) */
export const pickedHit = (p, v = null) => ({
  product: { id: p.id, name: p.name, price: p.price, image: p.image ?? null },
  variant: v ? { id: v.id, price: v.price, parts: v.parts ?? [] } : null,
});

/** تعديل بيع في المحل: سطور الطلب ← سلة (بالسعر الذي بيع به)، الأحدث في الأعلى كما في المسح */
export function orderToCart(order) {
  return (order?.items || []).map((it) => {
    if (!it.productId) return serviceLine(`svc:${it.id}`, { title: it.title, price: it.finalPrice, cost: it.cost }, Number(it.quantity || 1));
    const v = it.variantDetailId ? it.variantDetail : null;
    const parts = Array.isArray(v?.name) ? v.name.map((a) => ({ mode: a.displayMode || 'text', value: String(a.value ?? ''), attr: String(a.attrName ?? '') })) : [];
    return {
      key: it.variantDetailId ? `${it.productId}:${it.variantDetailId}` : it.productId,
      productId: it.productId, variantId: it.variantDetailId || undefined, name: it.product?.name || '—',
      image: it.product?.imagesProduct?.[0]?.imageUrl ?? null, parts, price: Number(it.finalPrice ?? 0), quantity: Number(it.quantity || 1),
    };
  }).reverse();
}

/** الاسم الافتراضي «زبون المحل» لا يُعرض كاسم مكتوب */
orderToCart.customer = (o) => ({ name: o?.customerName === 'زبون المحل' ? '' : o?.customerName || '', phone: o?.customerPhone || '' });

// ─── خدمات بلا منتج (فاتورة ماء، شحن رصيد…): وصف + مبلغ + تكلفة اختيارية، بلا مخزون ───

const num = (v) => (v === '' || v == null ? null : Number(v));
const serviceLine = (key, { title, price, cost }, quantity = 1) => ({
  key, service: true, productId: undefined, name: String(title ?? '').trim(), image: null, parts: [],
  price: Number(price || 0), cost: num(cost), quantity,
});

/** سطر خدمة جديد في أعلى السلة — كل خدمة سطر مستقل (n يجعل المفتاح فريداً) */
export const addService = (cart, svc, n = Date.now()) => [serviceLine(`svc:${n}`, svc), ...cart];

/** معلومات سطر في السلة (زر «معلومات»): المنتج والنسخة من /inventory — مخزون وحالة وسعر وباركود السطر نفسه */
export function lineInfo(products, line) {
  const product = (products || []).find((p) => String(p.id) === String(line.productId));
  if (!product) return null;
  const variant = line.variantId ? product.variants?.find((v) => String(v.id) === String(line.variantId)) ?? null : null;
  const src = variant || product;
  return { product, variant, stock: src.stock, status: src.status, price: src.price, barcode: src.barcode ?? null };
}
