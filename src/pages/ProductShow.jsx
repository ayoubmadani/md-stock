// إحصائيات المنتج (مثل صفحة المنتج في اللوحة): المؤشرات، الطلبات اليومية، الحالات،
// العروض والاختيارات الأكثر مبيعاً (تعديل السعر/الكمية + تفعيل/تعطيل)، وصفحات الهبوط
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2, ChevronLeft, Eye, Globe, LayoutTemplate, Layers, Loader2, Package, Pencil, Percent,
  Receipt, RefreshCw, ShoppingBag, Store, Tag, Trophy, Truck, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/orders';
import { barHeights, valueGroups } from '../lib/product-insights';
import { BarcodeField, GenerateBarcodesButton, Toggle } from '../components/product';
import { variantLabel } from '../components/inventory';

const RANGES = [7, 30, 90, 0]; // 0 = كل الفترة
const STATUS_COLORS = {
  pending: '#f59e0b', appl1: '#6366f1', appl2: '#8b5cf6', appl3: '#a855f7', confirmed: '#3b82f6',
  shipping: '#06b6d4', delivered: '#10b981', cancelled: '#ef4444', returned: '#f97316', postponed: '#64748b',
};
const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80';
const PAGE_ICON = { landing: Globe, builder: LayoutTemplate, store: Store };

function Kpi({ icon: Icon, color, label, value, hint }) {
  return (
    <div className={`${box} p-3`}>
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}><Icon className="w-4 h-4" style={{ color }} /></span>
        <div className="min-w-0">
          <p className="text-[11px] text-gray-400 truncate">{label}</p>
          <p className="font-black tabular-nums truncate"><bdi dir="ltr">{value}</bdi></p>
        </div>
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }) {
  return (
    <section className={`${box} overflow-hidden`}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
        <Icon className="w-4 h-4 text-indigo-500 shrink-0" />
        <div className="min-w-0"><h2 className="text-sm font-bold">{title}</h2>{subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}</div>
      </div>
      {children}
    </section>
  );
}

function Share({ value, total }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
      <span className="text-[11px] text-gray-400 tabular-nums w-8" dir="ltr">{pct}%</span>
    </div>
  );
}

function Rank({ i, sold }) {
  const top = i === 0 && sold;
  return (
    <span className={`inline-flex w-6 h-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${top ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-gray-50 text-gray-400 dark:bg-zinc-800'}`}>
      {top ? <Trophy className="w-3 h-3" /> : i + 1}
    </span>
  );
}

// خانة رقمية تُحفظ عند المغادرة؛ قيمة غير صالحة ترجع للقديمة
function NumberCell({ value, min = 0, integer = false, placeholder, onSave }) {
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(value ?? ''); }, [value]);
  const commit = async () => {
    const n = Number(draft);
    if (draft === '' || Number.isNaN(n) || n < min || (integer && !Number.isInteger(n))) { setDraft(value ?? ''); return; }
    if (n === Number(value)) return;
    setSaving(true);
    const ok = await onSave(n);
    setSaving(false);
    if (!ok) setDraft(value ?? '');
  };
  return (
    <input type="number" inputMode={integer ? 'numeric' : 'decimal'} dir="ltr" min={min} value={draft} placeholder={placeholder} disabled={saving}
      onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-full px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-sm font-bold tabular-nums disabled:opacity-50" />
  );
}

function Stat({ label, value }) {
  return <div className="min-w-0"><p className="text-[10px] text-gray-400 truncate">{label}</p><p className="text-sm font-bold tabular-nums truncate"><bdi dir="ltr">{value}</bdi></p></div>;
}

// باركود النسخة: يُكتب أو يُمسح أو يُولَّد، ويُحفظ عند الخروج من الحقل؛ وطباعة الملصق
function VariantBarcode({ v, product, onSave }) {
  const [code, setCode] = useState(v.barcode || '');
  const commit = (b) => {
    const next = String(b ?? '').trim() || null;
    if (next !== (v.barcode || null)) onSave(next);
  };
  return (
    <BarcodeField value={code} onChange={setCode} onCommit={commit} className="px-3 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:border-indigo-400 w-full"
      label={{ name: product.name, variant: variantLabel(v.name.map((e) => ({ mode: e.displayMode || 'text', value: e.value, attr: e.attrName }))), price: Number(v.price) > 0 ? Number(v.price) : Number(product.price) }} />
  );
}

export default function ProductShow() {
  const { t } = useTranslation();
  const { id } = useParams();
  const nav = useNavigate();
  const { storeId } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const DA = t('insights.currency');
  const price = (n) => `${money(n)} ${DA}`;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data: r } = await api.get(`/stores/${storeId}/products/${id}/analytics`, { params: days ? { days } : {} });
      setData(r?.data || r);
    } catch (e) {
      setError(e.response?.status === 404 ? t('insights.not_found') : t('insights.load_failed'));
    } finally { setLoading(false); }
  }, [storeId, id, days, t]);
  useEffect(() => { load(); }, [load]);

  const patchList = (key, ids, patch) => setData((d) => ({ ...d, [key]: d[key].map((o) => (ids.has(o.id) ? { ...o, ...patch(o) } : o)) }));

  const saveOption = async (kind, optionId, field, value) => {
    try {
      const { data: r } = await api.patch(`/stores/${storeId}/products/${id}/${kind}/${optionId}`, { [field]: value });
      const saved = r?.data || r;
      patchList(kind, new Set([optionId]), () => ({ [field]: saved?.[field] ?? value }));
      toast.success(t('insights.toast.saved'));
      return true;
    } catch (e) { toast.error(errorMessage(e, t('insights.toast.save_failed'))); return false; }
  };
  const toggleOption = async (kind, optionId) => {
    setBusy(optionId);
    try {
      const { data: r } = await api.patch(`/stores/${storeId}/products/${id}/${kind}/${optionId}/toggle-active`, {});
      const isActive = (r?.data || r)?.isActive;
      patchList(kind, new Set([optionId]), () => ({ isActive }));
      toast.success(isActive ? t('insights.toast.enabled') : t('insights.toast.disabled'));
    } catch { toast.error(t('insights.toast.toggle_failed')); } finally { setBusy(null); }
  };
  // قيمة كاملة (مثل الأحمر) في كل تركيباتها — معطّلة فقط إن كانت كل تركيباتها معطّلة
  const toggleValue = async (g) => {
    const key = `${g.attrName}::${g.value}`;
    const isActive = g.activeCount === 0;
    setBusy(key);
    try {
      const { data: r } = await api.patch(`/stores/${storeId}/products/${id}/variants/attribute-value`, { attrName: g.attrName, value: g.value, isActive });
      patchList('variants', new Set((r?.data || r)?.variantIds ?? []), () => ({ isActive }));
      toast.success(isActive ? t('insights.toast.enabled') : t('insights.toast.disabled'));
    } catch { toast.error(t('insights.toast.toggle_failed')); } finally { setBusy(null); }
  };

  if (loading && !data) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-indigo-500" /></div>;
  if (error && !data) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-sm text-gray-500">{error}</p>
        <button type="button" onClick={load} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">{t('insights.retry')}</button>
      </div>
    );
  }

  const { product, summary, daily, statuses, offers, variants, pages } = data;
  const groups = valueGroups(variants);
  const heights = barHeights(daily);
  const offerUnits = offers.reduce((s, o) => s + o.units, 0);
  const variantUnits = variants.reduce((s, v) => s + v.units, 0);
  const pageOrders = pages.reduce((s, p) => s + p.orders, 0);
  const statusTotal = statuses.reduce((s, x) => s + x.orders, 0);
  const onOff = (on) => <span className={`text-xs ${on ? 'text-emerald-600' : 'text-gray-400'}`}>{on ? t('insights.active') : t('insights.inactive')}</span>;

  return (
    <div className="max-w-3xl mx-auto space-y-3 pb-4">
      {/* الرأس */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => nav(-1)} className="p-2 rounded-xl text-gray-500 rtl:rotate-180"><ChevronLeft className="w-5 h-5" /></button>
        <span className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
          {product.image ? <img src={product.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-400" />}
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="font-black truncate"><bdi>{product.name}</bdi></h1>
          <p className="text-xs text-gray-400 truncate"><span dir="ltr">{price(product.price)}</span> · <span className={product.isActive ? 'text-emerald-600' : ''}>{product.isActive ? t('insights.active') : t('insights.inactive')}</span>{product.category && <> · <bdi>{product.category.name}</bdi></>}</p>
        </div>
        <Link to={`/products/${product.id}`} className="p-2.5 rounded-xl bg-indigo-600 text-white" title={t('insights.edit')}><Pencil className="w-4 h-4" /></Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-4 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800">
          {RANGES.map((r) => (
            <button key={r} type="button" onClick={() => setDays(r)} className={`py-1.5 rounded-lg text-xs font-bold ${days === r ? 'bg-white dark:bg-zinc-900 text-indigo-600 shadow-sm' : 'text-gray-500'}`}>
              {r ? t('insights.range.days', { count: r }) : t('insights.range.all')}
            </button>
          ))}
        </div>
        <button type="button" onClick={load} className="p-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-500" aria-label={t('insights.refresh')}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {/* المؤشرات */}
      <div className="grid grid-cols-2 gap-2">
        <Kpi icon={ShoppingBag} color="#6366f1" label={t('insights.kpi.orders')} value={money(summary.orders)} />
        <Kpi icon={CheckCircle2} color="#3b82f6" label={t('insights.kpi.confirmed')} value={money(summary.confirmed)} />
        <Kpi icon={Truck} color="#10b981" label={t('insights.kpi.delivered')} value={money(summary.delivered)} />
        <Kpi icon={Package} color="#8b5cf6" label={t('insights.kpi.units')} value={money(summary.units)} />
        <Kpi icon={Wallet} color="#059669" label={t('insights.kpi.revenue')} value={price(summary.revenue)} hint={t('insights.kpi.revenue_hint')} />
        <Kpi icon={Receipt} color="#0ea5e9" label={t('insights.kpi.aov')} value={price(summary.averageOrderValue)} />
        <Kpi icon={Eye} color="#f59e0b" label={t('insights.kpi.views')} value={money(summary.views)} />
        <Kpi icon={Percent} color="#ec4899" label={t('insights.kpi.conversion')} value={summary.conversionRate == null ? '—' : `${summary.conversionRate}%`} />
      </div>

      {/* الطلبات اليومية */}
      <section className={`${box} p-4`}>
        <h2 className="text-sm font-bold mb-3">{t('insights.chart.title')}</h2>
        {daily.length === 0 ? <p className="text-center text-sm text-gray-400 py-10">{t('insights.empty_sales')}</p> : (
          <>
            <div className="h-32 flex items-end gap-0.5" dir="ltr">
              {daily.map((d, i) => (
                <div key={d.day} className="flex-1 h-full flex items-end" title={`${d.day} · ${d.orders}`}>
                  <div className="w-full rounded-t bg-indigo-500/80" style={{ height: `${Math.max(heights[i], d.orders ? 4 : 0)}%` }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1" dir="ltr"><span>{daily[0].day.slice(5)}</span><span>{daily[daily.length - 1].day.slice(5)}</span></div>
          </>
        )}
      </section>

      {/* الحالات */}
      <section className={`${box} p-4`}>
        <h2 className="text-sm font-bold mb-3">{t('insights.statuses_title')}</h2>
        {statuses.length === 0 ? <p className="text-center text-sm text-gray-400 py-6">{t('insights.empty_sales')}</p> : (
          <div className="space-y-2.5">
            {[...statuses].sort((a, b) => b.orders - a.orders).map((s) => (
              <div key={s.status}>
                <div className="flex justify-between text-xs mb-1"><span className="font-medium">{t(`insights.status.${s.status}`, s.status)}</span><span className="text-gray-400 tabular-nums">{s.orders}</span></div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${statusTotal ? (s.orders / statusTotal) * 100 : 0}%`, background: STATUS_COLORS[s.status] || '#94a3b8' }} /></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* العروض */}
      <Section icon={Tag} title={t('insights.offers.title')} subtitle={t('insights.offers.subtitle')}>
        {offers.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">{t('insights.offers.empty')}</p> : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {offers.map((o, i) => (
              <div key={o.id} className={`p-3 space-y-2.5 ${o.isActive ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-2">
                  <Rank i={i} sold={o.units > 0} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate"><bdi>{o.name}</bdi></p>{(o.subTitle || o.shippingFree) && <p className="text-[11px] text-gray-400 truncate">{o.subTitle || t('insights.offers.free_shipping')}</p>}</div>
                  <Toggle checked={o.isActive} onChange={() => busy !== o.id && toggleOption('offers', o.id)}>{onOff(o.isActive)}</Toggle>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1"><span className="text-[10px] text-gray-400">{t('insights.offers.price')} ({DA})</span><NumberCell value={o.price} onSave={(n) => saveOption('offers', o.id, 'price', n)} /></label>
                  <label className="space-y-1"><span className="text-[10px] text-gray-400">{t('insights.offers.quantity')}</span><NumberCell value={o.quantity} min={1} integer onSave={(n) => saveOption('offers', o.id, 'quantity', n)} /></label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Stat label={t('insights.col.orders')} value={money(o.orders)} /><Stat label={t('insights.col.units')} value={money(o.units)} /><Stat label={t('insights.col.revenue')} value={price(o.revenue)} />
                </div>
                <Share value={o.units} total={offerUnits} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* الاختيارات */}
      <Section icon={Layers} title={t('insights.variants.title')} subtitle={t('insights.variants.subtitle')}>
        {variants.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">{t('insights.variants.empty')}</p> : (
          <>
            <div className="p-3 space-y-4 border-b border-gray-100 dark:border-zinc-800">
              <p className="text-[11px] text-gray-400">{t('insights.variants.by_value_hint')}</p>
              {Object.entries(groups).map(([attrName, list]) => {
                const attrUnits = list.reduce((s, g) => s + g.units, 0);
                return (
                  <div key={attrName} className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500"><bdi>{attrName}</bdi></h3>
                    {list.map((g) => {
                      const off = g.activeCount === 0;
                      return (
                        <div key={g.value} className={`flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-800 ${off ? 'opacity-60' : ''}`}>
                          {g.displayMode === 'color' ? <span className="w-7 h-7 rounded-lg border border-black/10 shrink-0" style={{ background: g.value }} />
                            : g.displayMode === 'image' ? <img src={g.value} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                            : <span className="min-w-7 h-7 px-1.5 rounded-lg bg-gray-50 dark:bg-zinc-800 text-xs font-bold flex items-center justify-center shrink-0"><bdi>{g.value}</bdi></span>}
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-[11px] text-gray-500 tabular-nums">{t('insights.variants.value_units', { count: g.units })} · <span dir="ltr">{price(g.revenue)}</span></p>
                            <Share value={g.units} total={attrUnits} />
                          </div>
                          {busy === `${g.attrName}::${g.value}` ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : <Toggle checked={!off} onChange={() => toggleValue(g)} />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="p-3 pb-0">
              <GenerateBarcodesButton storeId={storeId} productId={id} variants={variants}
                onDone={(codes) => patchList('variants', new Set(Object.keys(codes)), (o) => ({ barcode: codes[o.id] }))} />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {variants.map((v, i) => (
                <div key={v.id} className={`p-3 space-y-2.5 ${v.isActive ? '' : 'opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <Rank i={i} sold={v.units > 0} />
                    <div className="flex-1 min-w-0 flex flex-wrap gap-1">
                      {v.name.map((e, k) => (
                        <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-zinc-800 text-xs">
                          {e.displayMode === 'color' && <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: e.value }} />}
                          {e.displayMode === 'image' ? <img src={e.value} alt="" className="w-4 h-4 rounded object-cover" /> : <bdi>{e.displayMode === 'color' ? e.attrName : e.value}</bdi>}
                        </span>
                      ))}
                    </div>
                    <Toggle checked={v.isActive} onChange={() => busy !== v.id && toggleOption('variants', v.id)}>{onOff(v.isActive)}</Toggle>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* سعر ≤ 0 = سعر المنتج */}
                    <label className="space-y-1"><span className="text-[10px] text-gray-400">{t('insights.variants.price')} ({DA})</span><NumberCell value={v.price > 0 ? v.price : ''} placeholder={String(product.price)} onSave={(n) => saveOption('variants', v.id, 'price', n)} /></label>
                    <label className="space-y-1"><span className="text-[10px] text-gray-400">{t('insights.variants.stock')}</span><NumberCell value={v.stock} integer onSave={(n) => saveOption('variants', v.id, 'stock', n)} /></label>
                  </div>
                  <VariantBarcode key={v.barcode || ''} v={v} product={product} onSave={(code) => saveOption('variants', v.id, 'barcode', code)} />
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label={t('insights.col.orders')} value={money(v.orders)} /><Stat label={t('insights.col.units')} value={money(v.units)} /><Stat label={t('insights.col.revenue')} value={price(v.revenue)} />
                  </div>
                  <Share value={v.units} total={variantUnits} />
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* صفحات الهبوط */}
      <Section icon={Globe} title={t('insights.pages.title')} subtitle={t('insights.pages.subtitle')}>
        {pages.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">{t('insights.pages.empty')}</p> : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-800">
            {pages.map((p, i) => {
              const Icon = PAGE_ICON[p.type] || Globe;
              return (
                <div key={`${p.type}-${p.id}`} className={`p-3 space-y-2 ${p.isActive || p.type === 'store' ? '' : 'opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <Rank i={i} sold={p.orders > 0} />
                    <Icon className="w-4 h-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" dir={p.type === 'store' ? undefined : 'ltr'} style={{ textAlign: 'start' }}>{p.type === 'store' ? t('insights.pages.direct') : p.name}</p>
                      <p className="text-[11px] text-gray-400">{t(`insights.pages.type.${p.type}`)}{p.platform ? ` · ${p.platform}` : ''}{p.type !== 'store' && !p.isActive ? ` · ${t('insights.inactive')}` : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Stat label={t('insights.pages.views')} value={p.type === 'store' ? '—' : money(p.views)} />
                    <Stat label={t('insights.col.orders')} value={money(p.orders)} />
                    <Stat label={t('insights.pages.conversion')} value={p.conversionRate == null ? '—' : `${p.conversionRate}%`} />
                    <Stat label={t('insights.col.revenue')} value={money(p.revenue)} />
                  </div>
                  <Share value={p.orders} total={pageOrders} />
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}
