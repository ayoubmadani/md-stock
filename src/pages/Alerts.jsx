import StockPage from './Stock';

// التنبيهات: المنخفض والنافد فقط — ماذا يحتاج التاجر أن يطلب
export default function AlertsPage() {
  return <StockPage only="attention" />;
}
