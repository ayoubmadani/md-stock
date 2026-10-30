// زبائن المتجر: قائمة + بحث (الاسم أو الهاتف) + إنشاء — والديون الظاهرة لكل زبون
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Search, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { money } from '../lib/orders';
import { CustomerFormSheet, CustomerRow, useCustomers } from '../components/customers';

export default function CustomersPage() {
  const { t } = useTranslation();
  const { storeId, can } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [list] = useCustomers(storeId, q);
  const [creating, setCreating] = useState(false);
  const debt = (list || []).reduce((s, c) => s + Number(c.debt || 0), 0);
  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder={t('customers.search')}
            className="w-full ps-9 pe-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-indigo-400" />
        </div>
        {can('pos.sell') && (
          <button type="button" onClick={() => setCreating(true)} aria-label={t('customers.new')} className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">{t('customers.new')}</span>
          </button>
        )}
      </div>
      {debt > 0 && !q && (
        <div className="flex items-center justify-between rounded-xl bg-orange-50 dark:bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-700 dark:text-orange-300">
          <span>{t('customers.total_debt')}</span><bdi dir="ltr" className="font-black">{money(debt)} DA</bdi>
        </div>
      )}
      {list === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400 text-center"><Users className="w-9 h-9" /><p className="text-sm">{t(q ? 'customers.none' : 'customers.empty')}</p></div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-1.5 space-y-0.5">
            {list.map((c) => <CustomerRow key={c.id} c={c} onClick={() => nav(`/customers/${c.id}`)} />)}
          </div>
        )}
      {creating && <CustomerFormSheet storeId={storeId} customer={null} onClose={() => setCreating(false)} onSaved={(c) => nav(`/customers/${c.id}`)} />}
    </div>
  );
}
