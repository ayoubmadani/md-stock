// زر المسح في الأسفل ← صفحة /scan بخيارين: «طلب» (بيع في المحل، أيقونة سلة) و«معلومات» (منتج أو طلب، أيقونة استفهام)
// خيار واحد مسموح ← يُفتح مباشرة
export function scanChoices(can) {
  return [
    can('pos.sell') && { key: 'order', to: '/pos' },
    (can('product.crud') || can('order.view')) && { key: 'info', to: '/scan/info' },
  ].filter(Boolean);
}
