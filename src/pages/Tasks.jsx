// مهام المتجر (To-do) لصاحب المتجر وفريقه: إضافة من نافذة بيوم وساعة اختياريين، فلتر بالأيام، سحب المهمة لإنجازها، حذف — المنجزة آخر 30 يوماً تحت
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Check, ChevronDown, Clock, ListTodo, Loader2, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dueState, forDay, localNowTime, localToday, quickDays, splitTasks, swipeCommits } from '../lib/tasks';

const DUE_CLS = {
  overdue: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400',
  today: 'text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400',
  tomorrow: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400',
  later: 'text-gray-500 bg-gray-100 dark:bg-zinc-800 dark:text-zinc-400',
};

const TIMES = ['09:00', '12:00', '15:00', '18:00'];
const chip = (on) => `shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${on ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300'}`;

/** اسم اليوم: اليوم/غداً/بعد غد، ثم اسم يوم الأسبوع */
function useDayLabel() {
  const { t, i18n } = useTranslation();
  return (d) => (d.rel ? t(`tasks.due_${d.rel}`) : new Date(`${d.date}T00:00:00`).toLocaleDateString(i18n.language, { weekday: 'long' }));
}

function TaskRow({ task, today, now, onToggle, onDelete, busy }) {
  const { t, i18n } = useTranslation();
  const st = dueState(task, today, now);
  const [dx, setDx] = useState(0);
  const drag = useRef(null);
  // سحب أفقي (أي اتجاه) يكشف علامة الإنجاز؛ يكفي 80px لتأكيده
  const down = (e) => { if (!busy) drag.current = { x: e.clientX, y: e.clientY, h: null }; };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x;
    if (d.h === null && (Math.abs(mx) > 8 || Math.abs(e.clientY - d.y) > 8)) d.h = Math.abs(mx) > Math.abs(e.clientY - d.y);
    if (d.h) { if (!d.cap) { e.currentTarget.setPointerCapture?.(e.pointerId); d.cap = true; } setDx(mx); }
  };
  const up = () => {
    const commit = drag.current?.h && swipeCommits(dx);
    drag.current = null;
    setDx(0);
    if (commit) onToggle();
  };
  const ready = swipeCommits(dx);
  return (
    <div className="relative overflow-hidden">
      <div dir="ltr" className={`absolute inset-0 flex items-center px-5 ${dx > 0 ? 'justify-start' : 'justify-end'} ${task.done ? 'bg-gray-400' : 'bg-emerald-500'} text-white transition-opacity ${dx ? 'opacity-100' : 'opacity-0'}`}>
        {task.done ? <RotateCcw className={`w-5 h-5 transition-transform ${ready ? 'scale-125' : ''}`} /> : <Check className={`w-6 h-6 transition-transform ${ready ? 'scale-125' : ''}`} />}
      </div>
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ transform: `translateX(${dx}px)`, touchAction: 'pan-y' }}
        className={`relative flex items-start gap-3 p-3 bg-white dark:bg-zinc-900 select-none ${dx ? '' : 'transition-transform'}`}>
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
                {st === 'later' ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'short' }) : st === 'overdue' && task.dueDate === today ? t('tasks.due_today') : t(`tasks.due_${st}`)}
                {task.dueTime && <><Clock className="w-3 h-3 ms-1" /><bdi dir="ltr">{task.dueTime}</bdi></>}
              </span>
            )}
            {task.createdBy && <span className="text-[11px] text-gray-400"><bdi>{task.createdBy}</bdi></span>}
          </div>
        </div>
        <button type="button" onClick={onDelete} aria-label={t('tasks.delete')} className="p-1.5 rounded-lg text-gray-300 hover:text-rose-500 dark:text-zinc-600"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/** نافذة إضافة مهمة: العنوان، اليوم (اليوم/غداً/بعد غد/أسماء الأيام/يوم آخر)، والساعة */
function AddTaskSheet({ storeId, preset, onClose, onAdded }) {
  const { t } = useTranslation();
  const dayLabel = useDayLabel();
  const today = localToday();
  const days = quickDays(today);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(preset || '');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const otherDate = due && !days.some((d) => d.date === due);
  const otherTime = time && !TIMES.includes(time);

  // ساعة بلا يوم = اليوم
  const pickTime = (v) => { setTime(v); if (v && !due) setDue(today); };
  const pickDay = (d) => { setDue(d); if (!d) setTime(''); };

  const save = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post(`/stores/${storeId}/tasks`, { title: title.trim(), dueDate: due || null, dueTime: (due && time) || null });
      toast.success(t('tasks.added'));
      onAdded();
    } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={save} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-4 max-h-[90dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="font-bold">{t('tasks.new')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('tasks.placeholder')} maxLength={300} rows={2} autoFocus
          className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400 resize-none" />
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500"><CalendarDays className="w-4 h-4" />{t('tasks.day')}</p>
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => <button key={d.date} type="button" onClick={() => pickDay(due === d.date ? '' : d.date)} className={chip(due === d.date)}>{dayLabel(d)}</button>)}
            <label className={`${chip(otherDate)} relative`}>
              {otherDate ? <bdi dir="ltr">{due}</bdi> : t('tasks.other_date')}
              <input type="date" value={due} min={today} onChange={(e) => pickDay(e.target.value)} className="absolute inset-0 opacity-0" />
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Clock className="w-4 h-4" />{t('tasks.time')}</p>
          <div className="flex flex-wrap gap-1.5">
            {TIMES.map((h) => <button key={h} type="button" dir="ltr" onClick={() => pickTime(time === h ? '' : h)} className={chip(time === h)}>{h}</button>)}
            <label className={`${chip(otherTime)} relative`}>
              {otherTime ? <bdi dir="ltr">{time}</bdi> : t('tasks.other_time')}
              <input type="time" value={time} onChange={(e) => pickTime(e.target.value)} className="absolute inset-0 opacity-0" />
            </label>
          </div>
        </div>
        <button disabled={saving || !title.trim()} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{t('tasks.add')}
        </button>
      </form>
    </div>
  );
}

export default function TasksPage() {
  const { t } = useTranslation();
  const dayLabel = useDayLabel();
  const { storeId } = useAuth();
  const [list, setList] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [day, setDay] = useState(null);
  const today = localToday();
  const now = localNowTime();
  const days = quickDays(today);

  const load = useCallback(() => api.get(`/stores/${storeId}/tasks`).then((r) => setList(Array.isArray(r.data) ? r.data : [])).catch(() => setList([])), [storeId]);
  useEffect(() => { load(); }, [load]);

  const onAdded = () => { setAdding(false); load(); };

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

  const all = splitTasks(list || []);
  const { open, done } = splitTasks(forDay(list || [], day));
  const countFor = (d) => all.open.filter((x) => x.dueDate === d).length;
  const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800';
  return (
    <div className="max-w-xl mx-auto space-y-3">
      <button type="button" onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold">
        <Plus className="w-5 h-5" />{t('tasks.new')}
      </button>
      {adding && <AddTaskSheet storeId={storeId} preset={day} onClose={() => setAdding(false)} onAdded={onAdded} />}

      {list?.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          <button type="button" onClick={() => setDay(null)} className={chip(!day)}>{t('tasks.all')}</button>
          {days.map((d) => {
            const n = countFor(d.date);
            return (
              <button key={d.date} type="button" onClick={() => setDay(day === d.date ? null : d.date)} className={`${chip(day === d.date)} inline-flex items-center gap-1`}>
                {dayLabel(d)}{n > 0 && <span className={`min-w-4 px-1 rounded-full text-[10px] ${day === d.date ? 'bg-white/25' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'}`}>{n}</span>}
              </button>
            );
          })}
        </div>
      )}

      {list === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> : (
        <>
          {open.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400 text-center"><ListTodo className="w-9 h-9" /><p className="text-sm">{t(day ? 'tasks.none_day' : done.length ? 'tasks.all_done' : 'tasks.empty')}</p></div>
          ) : (
            <>
              <div className={box}>{open.map((x) => <TaskRow key={x.id} task={x} today={today} now={now} busy={busy === x.id} onToggle={() => toggle(x)} onDelete={() => remove(x)} />)}</div>
              <p className="text-center text-[11px] text-gray-400">{t('tasks.swipe_hint')}</p>
            </>
          )}
          {done.length > 0 && (
            <>
              <button type="button" onClick={() => setShowDone((v) => !v)} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 px-1">
                <ChevronDown className={`w-4 h-4 transition-transform ${showDone ? 'rotate-180' : ''}`} />{t('tasks.done_section', { count: done.length })}
              </button>
              {showDone && <div className={box}>{done.map((x) => <TaskRow key={x.id} task={x} today={today} now={now} busy={busy === x.id} onToggle={() => toggle(x)} onDelete={() => remove(x)} />)}</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}
