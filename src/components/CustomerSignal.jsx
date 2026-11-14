import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

// تنبيه «نفس الزبون» (يحسبه الخادم: customerSignal) — إطار ملوّن + نص تنبيه
// نسخة التطبيق من dashboard-order/src/pages/dashboard/orders/CustomerSignal.jsx — السيناريو: md-store-api/docs/superpowers/specs/2026-11-14-same-customer-orders-design.md

const TEXT = {
  risk: 'text-rose-700 dark:text-rose-400',
  dup_open: 'text-orange-700 dark:text-orange-400',
  dup_progress: 'text-violet-700 dark:text-violet-400',
  caution: 'text-amber-700 dark:text-amber-400',
  trusted: 'text-emerald-700 dark:text-emerald-400',
  previous: 'text-gray-600 dark:text-zinc-400',
  new: 'text-sky-700 dark:text-sky-400',
};
const CARD = {
  risk: 'border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/5',
  dup_open: 'border-orange-200 dark:border-orange-500/30 bg-orange-50/70 dark:bg-orange-500/5',
  dup_progress: 'border-violet-200 dark:border-violet-500/30 bg-violet-50/70 dark:bg-violet-500/5',
  caution: 'border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/5',
  trusted: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/5',
  previous: 'border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50',
  new: 'border-sky-200 dark:border-sky-500/30 bg-sky-50/70 dark:bg-sky-500/5',
};
const ICON = { risk: '⚠️', dup_open: '🔁', dup_progress: '🔁', caution: '⚠️', trusted: '✅', previous: 'ℹ️', new: '🆕' };

const LEVELS = new Set(Object.keys(TEXT));

/** جملة التنبيه — مشتركة بين القائمة وصفحة التعديل */
function useSignalText() {
  const { t: tr } = useTranslation();
  // نفس مفاتيح لوحة التحكم: signal.* و orders.status.*
  const t = (k, o) => tr(k.startsWith('status.') ? `orders.${k}` : k, o);
  const status = (st) => t(`status.${st}`, st);
  const dupText = (s) => {
    const d = s.dup?.[0];
    if (!d) return null;
    const store = d.storeName ? t('signal.in_store', { store: d.storeName }) : '';
    const key = ['confirmed', 'shipping'].includes(d.status) ? 'signal.dup_progress' : 'signal.dup_open';
    const age = d.ageDays > 0 ? t('signal.age', { count: d.ageDays }) : '';
    const more = s.dup.length > 1 ? t('signal.dup_more', { count: s.dup.length + 1 }) : '';
    const device = d.sameDevice ? t('signal.same_device_mark') : '';
    return `🔁 ${t(key, { ref: d.ref, status: status(d.status) })}${device}${store}${age}${more}`;
  };
  const historyText = (s) => {
    const { delivered, returned, cancelled, rate } = s.stats || {};
    const finished = (delivered || 0) + (returned || 0);
    if (s.level === 'risk') return `⚠️ ${t('signal.risk', { returned, finished, rate })}`;
    if (s.level === 'caution') {
      if (returned >= 1 && finished === 1) return `⚠️ ${t('signal.caution_one_return')}`;
      if (returned >= 1) return `⚠️ ${t('signal.caution_rate', { returned, finished, rate })}`;
      return `⚠️ ${t('signal.caution_cancelled', { count: cancelled })}`;
    }
    if (s.level === 'trusted' || (delivered >= 1 && rate < 30)) return `✅ ${t('signal.trusted', { delivered, finished })}`;
    if (s.stats?.total) return `ℹ️ ${t('signal.previous', { count: s.stats.total })}`;
    return null;
  };
  const line = (s) => {
    if (!s?.level || !LEVELS.has(s.level)) return null;
    if (s.hidden) return s.level === 'new' ? `🆕 ${t('signal.new')}` : `${ICON[s.level]} ${t('signal.hidden')}`;
    // معلومات بلا لون: طلب آخر لنفس الهاتف بمنتج مختلف، ونفس الجهاز برقم آخر
    const other = s.otherOpen?.length ? `➕ ${t('signal.other_open', { ref: s.otherOpen[0].ref, count: s.otherOpen.length })}` : null;
    const dev = s.device?.length ? `📱 ${t('signal.device', { ref: s.device[0].ref, phone: s.device[0].phone || '—', count: s.device.length })}` : null;
    if (s.level === 'new') return [`🆕 ${t('signal.new')}`, dev].filter(Boolean).join(' · ');
    const later = s.later?.length ? `🔁 ${t('signal.later', { ref: s.later[0].ref })}` : null;
    const dup = dupText(s);
    const hist = historyText(s);
    // الأهم أولاً: لون الإطار يحدد ما يُكتب أولاً
    const parts = s.level === 'risk' ? [hist, dup || later] : (s.level === 'dup_open' || s.level === 'dup_progress') ? [dup || later, hist] : [hist, dup || later];
    return [...parts, other, dev].filter(Boolean).join(' · ');
  };
  return { t, line, status };
}

/** سطر واحد في أعلى بطاقة الطلب */
export function CustomerSignalLine({ signal }) {
  const { line } = useSignalText();
  const text = line(signal);
  if (!text) return null;
  // سطر واحد بعرض الطلب كاملاً؛ النص الكامل عند الوقوف عليه وفي صفحة التعديل
  return <p title={text} className={`min-w-0 truncate text-[11px] font-semibold leading-snug ${TEXT[signal.level]}`}>{text}</p>;
}

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }); } catch { return ''; } };

/** بطاقة مفصّلة في أعلى صفحة تعديل الطلب */
export function CustomerSignalCard({ signal }) {
  const { t, line, status } = useSignalText();
  const text = line(signal);
  const info = (signal?.otherOpen?.length || 0) + (signal?.device?.length || 0);
  if (!text || (signal.level === 'new' && !info)) return null;
  const s = signal.stats || {};
  const groups = [
    ['dup', [...(signal.dup || []), ...(signal.later || [])]],
    ['other_open', signal.otherOpen || []],
    ['device', signal.device || []],
  ].filter(([, list]) => list.length);
  return (
    <div className={`rounded-2xl border p-4 text-sm ${CARD[signal.level]}`}>
      <p className={`font-bold ${TEXT[signal.level]}`}>{t(signal.level === 'new' ? 'signal.title_device' : `signal.title_${signal.level}`)}</p>
      <p className="mt-1 text-gray-700 dark:text-zinc-300">{text}</p>
      {!signal.hidden && (
        <>
          <p className="mt-2 text-xs text-gray-600 dark:text-zinc-400">
            {t('signal.summary', { delivered: s.delivered || 0, returned: s.returned || 0, cancelled: s.cancelled || 0, rate: s.rate || 0 })}
          </p>
          {signal.nameDiffers && <p className="mt-1 text-xs font-semibold text-gray-700 dark:text-zinc-300">✎ {t('signal.name_differs')}</p>}
          {groups.map(([g, list]) => (
            <div key={g} className="mt-3">
              <p className="mb-1 text-xs font-bold text-gray-700 dark:text-zinc-300">{t(`signal.group_${g}`)}</p>
              <ul className="divide-y divide-black/5 dark:divide-white/10 rounded-xl bg-white/70 dark:bg-zinc-900/40">
                {list.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs">
                    <Link to={`/orders/${r.id}`} onClick={(e) => e.stopPropagation()} className="font-mono font-bold text-indigo-700 dark:text-indigo-400 hover:underline">#{r.ref}</Link>
                    <span className="text-gray-500 dark:text-zinc-400">{fmtDate(r.createdAt)}</span>
                    {r.storeName && <span className="text-gray-600 dark:text-zinc-300">{r.storeName}</span>}
                    {r.customerName && <span className="text-gray-600 dark:text-zinc-300">{r.customerName}</span>}
                    {r.phone && <span dir="ltr" className="tabular-nums text-gray-600 dark:text-zinc-300">{r.phone}</span>}
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">{status(r.status)}</span>
                    {r.ageDays > 0 && <span className="text-gray-500 dark:text-zinc-400">{t('signal.age_short', { count: r.ageDays })}</span>}
                    {r.sameProduct && <span className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 font-semibold">{t('signal.same_product')}</span>}
                    {r.sameDevice && g !== 'device' && <span className="rounded bg-black/5 dark:bg-white/10 px-1.5 py-0.5 font-semibold">📱 {t('signal.same_device')}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
