// نسبة التقدّم لشريط صفحة الصور. المراحل غير المعروفة المدة تتقدّم بالوقت وتتباطأ،
// ولا تبلغ بداية المرحلة التالية أبدًا؛ التحويل إلى صور دقيق حسب عدد الأقسام الجاهزة.
const RANGES = {
  cutout: [0, 25, 20_000],
  palette: [25, 30, 0],
  design: [30, 75, 40_000],
  capture: [75, 95, 0],
  upload: [95, 100, 0],
};

export function progressFor({ step, elapsedMs = 0, captured = 0, count = 0 }) {
  const range = RANGES[step];
  if (!range) return 0;
  const [from, to, tau] = range;
  if (step === 'capture') return count ? Math.round(from + ((to - from) * captured) / count) : from;
  if (!tau) return from;
  // اقتراب أسّي من 98% من المدى
  return Math.round((from + (to - from) * 0.98 * (1 - Math.exp(-elapsedMs / tau))) * 10) / 10;
}
