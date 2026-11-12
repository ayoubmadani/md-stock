// ملاحظات الطلب في التطبيق: سبب اختياري بعد تغيير الحالة، وسجل الطلب (ملاحظات المتجر والمؤكّدين) مع خانة ملاحظة
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageSquareText, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { noteBody, REASONS } from '../lib/order-notes';

const postNote = (orderId, body) => api.post(`/orders/${orderId}/notes`, body);

/** change = { orderId, from, to, name } — «تخطّي» لا يحفظ شيئاً */
export function ReasonSheet({ change, onClose, onSaved }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const body = noteBody({ from: change.from, to: change.to, reason, text });
  const save = async () => {
    if (!body) return onClose();
    setSaving(true);
    try { await postNote(change.orderId, body); onSaved?.(); onClose(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm p-5 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold">{t('order_notes.reason_title')}</p>
            <p className="text-xs text-gray-400 truncate"><bdi>{change.name}</bdi>{change.name ? ' — ' : ''}{t(`orders.status.${change.to}`)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button key={r} type="button" onClick={() => setReason(reason === r ? null : r)}
              className={`px-3 py-2 rounded-full text-xs font-bold border ${reason === r ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-300'}`}>
              {t(`order_notes.reasons.${r}`)}
            </button>
          ))}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500} placeholder={t('order_notes.text_ph')}
          className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-base outline-none focus:border-indigo-400" />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="py-3 rounded-xl border border-gray-200 dark:border-zinc-700 text-sm font-bold text-gray-500">{t('order_notes.skip')}</button>
          <button type="button" onClick={save} disabled={saving || !body} className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t('order_notes.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderNotesCard({ orderId, reloadKey = 0 }) {
  const { t, i18n } = useTranslation();
  const [list, setList] = useState(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    api.get(`/orders/${orderId}/notes`).then((r) => setList(r.data || [])).catch(() => setList([]));
  }, [orderId]);
  useEffect(() => { load(); }, [load, reloadKey]);

  const add = async () => {
    const body = noteBody({ text });
    if (!body) return;
    setSaving(true);
    try { await postNote(orderId, body); setText(''); load(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setSaving(false); }
  };
  const when = (d) => new Date(d).toLocaleString(i18n.language === 'ar' ? 'ar-DZ' : i18n.language, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4 space-y-3">
      <p className="flex items-center gap-2 font-bold text-sm"><MessageSquareText className="w-4 h-4 text-indigo-500" />{t('order_notes.title')}</p>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={t('order_notes.add_ph')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-base outline-none focus:border-indigo-400" />
        <button type="button" onClick={add} disabled={saving || !text.trim()} aria-label={t('order_notes.save')} className="shrink-0 px-4 rounded-xl bg-indigo-600 text-white disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
      {!list ? <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        : list.length === 0 ? <p className="text-center text-xs text-gray-400">{t('order_notes.empty')}</p>
        : (
          <ul className="space-y-2">
            {list.map((n) => (
              <li key={n.id} className="rounded-xl bg-gray-50 dark:bg-zinc-800/60 p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                  <span className="font-bold text-gray-700 dark:text-zinc-200"><bdi>{n.authorName || '—'}</bdi></span>
                  {n.source === 'confirmation' && <span className="px-1.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-600">{t('order_notes.confirmer')}</span>}
                  {n.toStatus && <span>{n.fromStatus ? `${t(`orders.status.${n.fromStatus}`)} ← ` : ''}{t(`orders.status.${n.toStatus}`)}</span>}
                  <span className="ms-auto" dir="ltr">{when(n.createdAt)}</span>
                </div>
                {n.reason && <span className="inline-block px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-semibold">{t(`order_notes.reasons.${n.reason}`)}</span>}
                {n.text && <p className="text-sm whitespace-pre-wrap">{n.text}</p>}
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
