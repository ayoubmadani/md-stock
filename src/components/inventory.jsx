// عناصر مشتركة لصفحات المخزون: الحالة، نافذة التوريد/الجرد، خانة تُحفظ عند الخروج
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';
import { api, errorMessage } from '../lib/api';

export const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

const STATUS_CLS = {
  ok: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  low: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  out: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
};

export function StatusBadge({ status }) {
  const { t } = useTranslation();
  return <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold whitespace-nowrap ${STATUS_CLS[status]}`}>{t(`inventory.status.${status}`)}</span>;
}

// أجزاء النسخة من الخادم (parts) أو من السجل (variantName الخام)
const toParts = (v) => (Array.isArray(v) ? v.map((a) => ({ mode: a.mode || a.displayMode || 'text', value: String(a.value ?? ''), attr: a.attr || a.attrName || '' })) : []);

/** النسخة كما يراها الزبون: نص يُكتب، صورة مصغّرة، أو دائرة لون */
export function VariantParts({ parts, className = '' }) {
  const list = toParts(parts);
  if (!list.length) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {list.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-gray-300 dark:text-zinc-600">/</span>}
          {p.mode === 'image' ? (
            <img src={p.value} alt={p.attr} title={p.attr} className="w-5 h-5 rounded-md object-cover border border-gray-200 dark:border-zinc-700" />
          ) : p.mode === 'color' ? (
            <span title={p.attr} className="w-4 h-4 rounded-full border border-gray-200 dark:border-zinc-700" style={{ backgroundColor: p.value }} />
          ) : (
            <span>{p.value}</span>
          )}
        </span>
      ))}
    </span>
  );
}

// نص فقط (عنوان نافذة التوريد): الصورة/اللون بلا اسم ← اسم الخاصية
export const variantLabel = (v) => toParts(v).map((p) => (p.mode === 'text' ? p.value : p.attr)).join(' / ');

const input = 'w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-xl text-base text-gray-900 dark:text-white outline-none focus:border-indigo-400';

// توريد (+) أو جرد (= الرقم الفعلي) لمنتج أو نسخة
export function AdjustModal({ target, storeId, onClose, onSaved }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(target.mode);
  const [quantity, setQuantity] = useState(target.mode === 'set' ? String(target.stock) : '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/stores/${storeId}/inventory/adjust`, {
        productId: target.productId,
        variantDetailId: target.variantId || null,
        mode,
        quantity: Number(quantity),
        note: note.trim() || undefined,
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, t('inventory.error')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl border border-gray-100 dark:border-zinc-800 w-full sm:max-w-sm p-6 space-y-4 shadow-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white">{target.name}</h3>
            <p className="text-xs text-gray-400">{t('inventory.col.stock')}: <b dir="ltr">{target.stock}</b></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800">
          {['add', 'set'].map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setQuantity(m === 'set' ? String(target.stock) : ''); }}
              className={`py-2 rounded-lg text-sm font-bold ${mode === m ? 'bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>
              {m === 'add' ? t('inventory.restock') : t('inventory.count')}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-500">{mode === 'add' ? t('inventory.mode_add') : t('inventory.mode_set')}</label>
          <input type="number" inputMode="numeric" dir="ltr" min={mode === 'set' ? 0 : undefined} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={input} autoFocus />
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('inventory.note')} className={input} maxLength={255} />
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <button onClick={save} disabled={saving || quantity === ''}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl disabled:opacity-50">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('inventory.save')}
        </button>
      </div>
    </div>
  );
}

// خانة رقم تُحفظ عند الخروج منها (حد التنبيه / سعر الشراء) — key من الأب يعيد تهيئتها
export function InlineNumber({ value, onSave, placeholder, className = '' }) {
  const [v, setV] = useState(value ?? '');
  return (
    <input type="number" inputMode="decimal" dir="ltr" min={0} value={v} placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (String(v) !== String(value ?? '')) onSave(v === '' ? null : Number(v)); }}
      className={`w-20 px-2 py-1 bg-transparent border border-gray-200 dark:border-zinc-700 focus:border-indigo-400 rounded-lg text-sm text-gray-900 dark:text-white outline-none ${className}`} />
  );
}
