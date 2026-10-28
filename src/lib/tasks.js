// مهام المتجر (To-do): حالة تاريخ الاستحقاق وتقسيم المفتوحة/المنجزة

const addDay = (d) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** overdue | today | tomorrow | later | none — المنجزة لا تتأخر، ومهمة اليوم تتأخر بعد ساعتها */
export function dueState(task, today, nowTime = null) {
  if (!task.dueDate || task.done) return 'none';
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today && task.dueTime && nowTime && task.dueTime < nowTime) return 'overdue';
  if (task.dueDate === today) return 'today';
  if (task.dueDate === addDay(today)) return 'tomorrow';
  return 'later';
}

export const splitTasks = (list) => ({ open: list.filter((x) => !x.done), done: list.filter((x) => x.done) });

/** تاريخ اليوم المحلي YYYY-MM-DD */
export const localToday = (now = new Date()) => new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

/** الساعة المحلية HH:MM */
export const localNowTime = (now = new Date()) => `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

const REL = ['today', 'tomorrow', 'after_tomorrow'];
/** الأيام السبعة القادمة لاختيار سريع/فلتر: اليوم، غداً، بعد غد ثم أسماء الأيام */
export function quickDays(today, count = 7) {
  const out = [];
  for (let i = 0, d = today; i < count; i++, d = addDay(d)) out.push({ date: d, rel: REL[i] ?? null });
  return out;
}

/** مهام يوم معيّن (null = الكل) */
export const forDay = (list, day) => (day ? list.filter((x) => x.dueDate === day) : list);

/** سحب المهمة أفقياً (أي اتجاه) بما يكفي يؤكد الإنجاز */
export const SWIPE_PX = 80;
export const swipeCommits = (dx) => Math.abs(dx) >= SWIPE_PX;
