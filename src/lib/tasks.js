// مهام المتجر (To-do): حالة تاريخ الاستحقاق وتقسيم المفتوحة/المنجزة

const addDay = (d) => new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** overdue | today | tomorrow | later | none — المنجزة لا تتأخر */
export function dueState(task, today) {
  if (!task.dueDate || task.done) return 'none';
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  if (task.dueDate === addDay(today)) return 'tomorrow';
  return 'later';
}

export const splitTasks = (list) => ({ open: list.filter((x) => !x.done), done: list.filter((x) => x.done) });

/** تاريخ اليوم المحلي YYYY-MM-DD */
export const localToday = (now = new Date()) => new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
