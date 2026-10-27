// زبائن المتجر: صورة الزبون، نموذج إنشاء/تعديل (اسم، هاتفان، صورة)، ونافذة اختيار زبون أو إنشاء جديد
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2, Plus, Search, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { money } from '../lib/orders';
import { EMPTY_CUSTOMER, customerBody, customerReady, customerToForm } from '../lib/customers';
import ImageLibrary from './ImageLibrary';

const input = 'w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400';
const sheetWrap = 'fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4';
const sheet = 'bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-4 space-y-3 max-h-[90dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]';

export function CustomerAvatar({ c, size = 'w-10 h-10' }) {
  return (
    <span className={`${size} rounded-full overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center`}>
      {c?.photoUrl ? <img src={c.photoUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-1/2 h-1/2 text-gray-400" />}
    </span>
  );
}

export const DebtBadge = ({ debt }) => (Number(debt) > 0
  ? <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-bold shrink-0"><bdi dir="ltr">{money(debt)} DA</bdi></span>
  : null);

// صورة الزبون من المكتبة (أو الكاميرا)
function PhotoPick({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <div className="relative">
        <button type="button" onClick={() => setOpen(true)} className={`w-24 h-24 rounded-full border-2 border-dashed border-gray-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-zinc-950`}>
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-6 h-6" />}
        </button>
        {value && <button type="button" onClick={() => onChange('')} className="absolute top-1 end-1 p-1 rounded-full bg-black/60 text-white"><X className="w-3.5 h-3.5" /></button>}
      </div>
      {open && <ImageLibrary folder="customers" max={1} onPick={([u]) => { setOpen(false); onChange(u); }} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** إنشاء زبون (customer = null) أو تعديله */
export function CustomerFormSheet({ storeId, customer, onSaved, onClose }) {
  const { t } = useTranslation();
  const [f, setF] = useState(customer ? customerToForm(customer) : EMPTY_CUSTOMER);
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));
  const save = async (e) => {
    e.preventDefault();
    if (!customerReady(f)) return toast.error(t('customers.required'));
    setSaving(true);
    try {
      const { data } = customer
        ? await api.patch(`/stores/${storeId}/customers/${customer.id}`, customerBody(f))
        : await api.post(`/stores/${storeId}/customers`, customerBody(f));
      toast.success(t(customer ? 'customers.saved' : 'customers.created'));
      onSaved(data);
    } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); setSaving(false); }
  };
  return (
    <div className={sheetWrap} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={save} className={sheet}>
        <div className="flex items-center justify-between">
          <p className="font-bold">{t(customer ? 'customers.edit' : 'customers.new')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-3">
          <PhotoPick value={f.photoUrl} onChange={set('photoUrl')} label={t('customers.photo')} />
          <div className="flex-1 min-w-0 space-y-2">
            <input value={f.name} onChange={set('name')} placeholder={t('customers.name')} className={input} autoFocus={!customer} />
            <input value={f.phone} onChange={set('phone')} type="tel" inputMode="tel" dir="ltr" placeholder={t('customers.phone')} className={input} />
          </div>
        </div>
        <input value={f.phone2} onChange={set('phone2')} type="tel" inputMode="tel" dir="ltr" placeholder={t('customers.phone2')} className={input} />
        <button disabled={saving || !customerReady(f)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}{t(customer ? 'inventory.save' : 'customers.create')}
        </button>
      </form>
    </div>
  );
}

export function CustomerRow({ c, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 text-start">
      <CustomerAvatar c={c} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate"><bdi>{c.name}</bdi></span>
        <span className="block text-xs text-gray-500 truncate" dir="ltr" style={{ textAlign: 'start' }}>{[c.phone, c.phone2].filter(Boolean).join(' · ')}</span>
      </span>
      <DebtBadge debt={c.debt} />
    </button>
  );
}

/** قائمة الزبائن مع البحث (الاسم أو الهاتف)، تُحدَّث بعد توقف الكتابة */
export function useCustomers(storeId, q) {
  const [list, setList] = useState(null);
  useEffect(() => {
    const id = setTimeout(() => {
      api.get(`/stores/${storeId}/customers`, { params: { q: q.trim() || undefined } })
        .then((r) => setList(Array.isArray(r.data) ? r.data : [])).catch(() => setList([]));
    }, q ? 300 : 0);
    return () => clearTimeout(id);
  }, [storeId, q]);
  return [list, setList];
}

/** اختيار زبون للبيع، أو إنشاء جديد (يُختار مباشرة بعد الإنشاء) */
export function CustomerPickerSheet({ storeId, onPick, onClose }) {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [list] = useCustomers(storeId, q);
  const [creating, setCreating] = useState(false);
  if (creating) return <CustomerFormSheet storeId={storeId} customer={null} onClose={() => setCreating(false)} onSaved={onPick} />;
  return (
    <div className={sheetWrap} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${sheet} h-[85dvh] flex flex-col`}>
        <div className="flex items-center justify-between">
          <p className="font-bold">{t('customers.pick')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder={t('customers.search')} className={`${input} ps-9`} autoFocus />
        </div>
        <button type="button" onClick={() => setCreating(true)} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 text-sm font-bold text-indigo-600 dark:text-indigo-400"><Plus className="w-4 h-4" />{t('customers.new')}</button>
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1">
          {list === null && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}
          {list?.length === 0 && <p className="text-center text-sm text-gray-400 py-8">{t('customers.none')}</p>}
          {list?.map((c) => <CustomerRow key={c.id} c={c} onClick={() => onPick(c)} />)}
        </div>
      </div>
    </div>
  );
}
