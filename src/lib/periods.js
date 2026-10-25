// فترات التقارير بتوقيت الجزائر (YYYY-MM-DD) — نفس توقيت الخادم في حساب الطلبات
const TZ = 'Africa/Algiers';

export const localDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const shift = (ymd, days) => {
  const t = new Date(`${ymd}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};

export function periodRange(kind, now = new Date()) {
  const today = localDate(now);
  if (kind === 'today') return { from: today, to: today };
  if (kind === '7d') return { from: shift(today, -6), to: today };
  if (kind === '30d') return { from: shift(today, -29), to: today };
  if (kind === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
  throw new Error(`unknown period ${kind}`);
}
