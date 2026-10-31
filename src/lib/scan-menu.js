// زر المسح في الأسفل: البيع في المحل («طلب») مباشرة — معلومات المنتج من زر في سطر السلة.
// عضو بلا بيع في المحل: معلومات المنتج أو الطلب (/scan/info). بلا صلاحية: لا زر.
export function scanTarget(can) {
  if (can('pos.sell')) return '/pos';
  if (can('product.crud') || can('order.view')) return '/scan/info';
  return null;
}
