// مهام المتجر (To-do) لصاحب المتجر وفريقه: إضافة بتاريخ اختياري، تعليم كمنجزة، حذف — المنجزة آخر 30 يوماً تحت
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Check, ChevronDown, ListTodo, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dueState, localToday, splitTasks } from '../lib/tasks';

const DUE_CLS = {
  overdue: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400',
  today: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
  tomorrow: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400',
  later: 'text-gray-500 bg-gray-100 dark:bg-zinc-800 dark:text-zinc-400',
};

function TaskRow({ task, today, onToggle, onDelete, busy }) {
  const { t, i18n } = useTranslation();
  const st = dueState(task, today);
  return (
    <div className="flex items-start gap-3 p-3">
      <button type="button" disabled={busy} onClick={onToggle} aria-label={t('tasks.toggle')}
        className={`mt-0.5 w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center disabled:opacity-50 ${task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-zinc-600'}`}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : task.done && <Check className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm break-words ${task.done ? 'line-through text-gray-400' : 'font-semibold'}`}><bdi>{task.title}</bdi></p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {st !== 'none' && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold ${DUE_CLS[st]}`}>
              <CalendarDays className="w-3 h-3" />
              {st === 'later' ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) : t(`tasks.due_${st}`)}
            </span>
          )}
          {task.createdBy && <span className="text-[11px] text-gray-400"><bdi>{task.createdBy}</bdi></span>}
        </div>
      </div>
      <button type="button" onClick={onDelete} aria-label={t('tasks.delete')} className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 dark:text-zinc-600"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

export default function TasksPage() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [list, setList] = useState(null);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const today = localToday();

  const load = useCallback(() => api.get(`/stores/${storeId}/tasks`).then((r) => setList(Array.isArray(r.data) ? r.data : [])).catch(() => setList([])), [storeId]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      await api.post(`/stores/${storeId}/tasks`, { title: title.trim(), dueDate: due || null });
      setTitle(''); setDue(''); setShowDate(false);
      await load();
    } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); } finally { setAdding(false); }
  };

  const toggle = async (task) => {
    setBusy(task.id);
    // فوري في الواجهة، ثم من الخادم
    setList((l) => l.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)));
    try { await api.patch(`/stores/${storeId}/tasks/${task.id}`, { done: !task.done }); await load(); } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); load(); } finally { setBusy(null); }
  };

  const remove = async (task) => {
    setList((l) => l.filter((x) => x.id !== task.id));
    try { await api.delete(`/stores/${storeId}/tasks/${task.id}`); } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); load(); }
  };

  const { open, done } = splitTasks(list || []);
  const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800';
  return (
    <div className="max-w-xl mx-auto space-y-3">
      <form onSubmit={add} className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-2 space-y-2">
        <div className="flex items-center gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('tasks.placeholder')} maxLength={300}
            className="flex-1 min-w-0 px-3 py-2.5 bg-transparent text-base outline-none" />
          <button type="button" onClick={() => setShowDate((v) => !v)} aria-label={t('tasks.due')} className={`p-2.5 rounded-xl ${due ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'text-gray-400'}`}><CalendarDays className="w-5 h-5" /></button>
          <button disabled={adding || !title.trim()} aria-label={t('tasks.add')} className="p-2.5 rounded-xl bg-indigo-600 text-white disabled:opacity-40">{adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}</button>
        </div>
        {showDate && (
          <div className="flex items-center gap-2 px-1 pb-1">
            <span className="text-xs text-gray-500">{t('tasks.due')}</span>
            <input type="date" value={due} min={today} onChange={(e) => setDue(e.target.value)} dir="ltr" className="flex-1 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-sm" />
            {due && <button type="button" onClick={() => setDue('')} className="p-1.5 text-gray-400"><X className="w-4 h-4" /></button>}
          </div>
        )}
      </form>

      {list === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> : (
        <>
          {open.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400 text-center"><ListTodo className="w-9 h-9" /><p className="text-sm">{t(done.length ? 'tasks.all_done' : 'tasks.empty')}</p></div>
          ) : (
            <div className={box}>{open.map((x) => <TaskRow key={x.id} task={x} today={today} busy={busy === x.id} onToggle={() => toggle(x)} onDelete={() => remove(x)} />)}</div>
          )}
          {done.length > 0 && (
            <>
              <button type="button" onClick={() => setShowDone((v) => !v)} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 px-1">
                <ChevronDown className={`w-4 h-4 transition-transform ${showDone ? 'rotate-180' : ''}`} />{t('tasks.done_section', { count: done.length })}
              </button>
              {showDone && <div className={box}>{done.map((x) => <TaskRow key={x.id} task={x} today={today} busy={busy === x.id} onToggle={() => toggle(x)} onDelete={() => remove(x)} />)}</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}
