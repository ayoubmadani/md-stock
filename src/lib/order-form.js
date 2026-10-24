// منطق نموذج الطلب (تعديل/إنشاء) — نفس قواعد صفحة الطلب في لوحة التاجر

// attrId غير مضمون في البيانات القديمة — التجميع باسم الخاصية
const attrKey = (a) => a.attrName || a.attrId || '';

/** خصائص النسخ (مقاس، لون…) وخيارات كل منها */
export function attrGroups(variants) {
  const groups = [];
  const index = {};
  for (const v of variants || []) {
    for (const a of Array.isArray(v.name) ? v.name : []) {
      const key = attrKey(a);
      if (!index[key]) {
        index[key] = { key, attrName: a.attrName, displayMode: a.displayMode, options: [] };
        groups.push(index[key]);
      }
      if (!index[key].options.some((o) => o.value === a.value)) index[key].options.push({ value: a.value });
    }
  }
  return groups;
}

// متوفرة = مخزون > 0 أو «متوفرة دائماً» — نفس قاعدة المتجر
const available = (v) => !!v && v.isActive !== false && (v.autoGenerate || Number(v.stock) > 0);

/** النسخة بعد تغيير خاصية واحدة؛ null إن كانت التركيبة الكاملة غير متوفرة */
export function findVariant(variants, currentAttrs, key, value) {
  const target = {};
  for (const a of currentAttrs || []) target[attrKey(a)] = a.value;
  target[key] = value;
  const exact = (variants || []).find((v) => Array.isArray(v.name) && v.name.length > 0 && v.name.every((a) => target[attrKey(a)] === a.value));
  if (exact) return available(exact) ? exact : null;
  const complete = attrGroups(variants).every((g) => target[g.key] !== undefined && target[g.key] !== '');
  if (complete) return null;
  return (variants || []).find((v) => available(v) && Array.isArray(v.name) && v.name.some((a) => attrKey(a) === key && a.value === value)) || null;
}

export const itemsTotal = (items) => (items || []).reduce((s, it) => s + Number(it.finalPrice || 0) * (it.quantity || 1), 0);

/** توصيل مجاني: عرض أو منتج مجاني التوصيل، وإلا عتبة المتجر إن كانت مفعّلة */
export function isFreeShipping(order, store) {
  if ((order.items || []).some((it) => it?.offer?.shippingFree || it?.product?.shippingFree)) return true;
  if (store?.supportFreeShipping && store?.freeShippingMinAmount != null) return itemsTotal(order.items) >= Number(store.freeShippingMinAmount);
  return false;
}

export const shipPrice = (wilaya, typeShip) => Number((typeShip === 'office' ? wilaya?.livraisonOfice : wilaya?.livraisonHome) || 0);

/**
 * جسم الطلب كما ترسله اللوحة: عنصر لكل منتج.
 * تعديل (PATCH /orders/:id) يحمل الحالة؛ إنشاء (POST /orders، storeId) يبدأ «معلّق» من الخادم.
 */
export function orderPayload(form, { free, storeId } = {}) {
  const priceShip = free ? 0 : Number(form.priceShip || 0);
  const customer = {
    customerName: form.customerName?.trim(),
    customerPhone: form.customerPhone?.trim(),
    customerEmail: form.customerEmail?.trim() || undefined,
    customerWhatsapp: form.customerWhatsapp?.trim() || undefined,
    customerWilayaId: form.customerWilayaId || undefined,
    customerCommuneId: form.customerCommuneId || undefined,
    typeShip: form.typeShip,
    priceShip,
  };
  return (form.items || []).map((it) => {
    const line = {
      productId: it.productId,
      quantity: it.quantity || 1,
      variantDetailId: it.variantDetailId || null,
      offerId: it.offerId || null,
      finalPrice: Number(it.finalPrice || 0),
    };
    if (storeId) {
      return { storeId, ...customer, priceLoss: 0, platform: 'dashboard', ...line, totalPrice: line.finalPrice * line.quantity };
    }
    return {
      customerName: customer.customerName, customerPhone: customer.customerPhone,
      customerEmail: customer.customerEmail, customerWhatsapp: customer.customerWhatsapp,
      customerWilayaId: customer.customerWilayaId, customerCommuneId: customer.customerCommuneId,
      status: form.status, typeShip: customer.typeShip, priceShip,
      ...line,
    };
  });
}

/** الخانات الناقصة قبل الحفظ (مفاتيح ترجمة) */
export function missingFields(form) {
  const out = [];
  if (!form.customerName?.trim()) out.push('name');
  if (!form.customerPhone?.trim()) out.push('phone');
  if (form.isDigital) {
    if (!form.customerEmail?.trim() && !form.customerWhatsapp?.trim()) out.push('contact');
  } else {
    if (!form.customerWilayaId) out.push('wilaya');
    if (!form.customerCommuneId) out.push('commune');
  }
  if (!form.items?.length) out.push('items');
  return out;
}
