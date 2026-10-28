// الثيمات: ثيماتي (الافتراضي + المثبّتة + ضمن الاشتراك) للتفعيل، والمعرض للتثبيت/الشراء — نفس مسارات اللوحة
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Crown, ExternalLink, Loader2, Palette, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { money } from '../lib/orders';
import { themeName, themeStatus } from '../lib/themes';
import { input } from '../components/product';

const PREVIEW = 'https://mdstore.top/show/';

function Thumb({ src, short }) {
  return (
    <div className={`${short ? 'h-40' : 'aspect-[4/3]'} bg-gray-100 dark:bg-zinc-800 overflow-hidden`}>
      {src ? <img src={src} alt="" loading="lazy" className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center"><Palette className="w-8 h-8 text-gray-300 dark:text-zinc-600" /></div>}
    </div>
  );
}

// شراء ثيم مدفوع: السعر + كوبون اختياري، يُخصم من المحفظة
function BuySheet({ theme, onClose, onBought }) {
  const { t, i18n } = useTranslation();
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [busy, setBusy] = useState(null);
  const price = Number(theme.price);

  const check = async () => {
    setBusy('coupon');
    try {
      const { data } = await api.post('/coupons/validate', { code: code.trim(), scope: 'theme', basePrice: price });
      setCoupon(data);
    } catch (e) { setCoupon(null); toast.error(errorMessage(e, t('themes.coupon_invalid'))); } finally { setBusy(null); }
  };
  const buy = async () => {
    setBusy('buy');
    try {
      const { data } = await api.post(`/theme/install-theme/${theme.id}`, { couponCode: coupon ? code.trim() : undefined });
      if (data?.success === false) throw new Error(data.message);
      toast.success(t('themes.installed_ok'));
      onBought();
    } catch (e) { toast.error(e?.response ? errorMessage(e, t('inventory.error')) : e.message); setBusy(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md overflow-hidden pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Thumb src={theme.imageUrl} short />
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold truncate"><bdi>{themeName(theme, i18n.language)}</bdi></p>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-2xl font-black" dir="ltr" style={{ textAlign: 'start' }}>
            {coupon && <span className="text-base text-gray-400 line-through me-2">{money(price)}</span>}
            {money(coupon ? coupon.finalPrice : price)} <span className="text-sm">DA</span>
          </p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => { setCode(e.target.value.toUpperCase()); setCoupon(null); }} autoCapitalize="characters" placeholder={t('themes.coupon')} dir="ltr" className={input} />
            <button type="button" disabled={!code.trim() || busy} onClick={check} className="px-4 rounded-xl bg-gray-100 dark:bg-zinc-800 text-sm font-bold disabled:opacity-50 flex items-center gap-1">
              {busy === 'coupon' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}{t('themes.apply')}
            </button>
          </div>
          <p className="text-xs text-gray-400">{t('themes.wallet_note')}</p>
          <button type="button" disabled={!!busy} onClick={buy} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-60">
            {busy === 'buy' && <Loader2 className="w-4 h-4 animate-spin" />}{t('themes.buy')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ThemesPage() {
  const { t, i18n } = useTranslation();
  const { storeId, store } = useAuth();
  const [tab, setTab] = useState('my');
  const [mine, setMine] = useState(null);
  const [plan, setPlan] = useState([]);
  const [planIds, setPlanIds] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('');
  const [gallery, setGallery] = useState(null);
  const [busy, setBusy] = useState(null);
  const [buying, setBuying] = useState(null);

  const load = useCallback(() => {
    Promise.all([
      api.get('/theme/my').then((r) => r.data ?? []).catch(() => []),
      api.get('/theme/plan-sub').then((r) => r.data ?? []).catch(() => []),
      api.get('/theme/plan-info').then((r) => r.data?.planThemeIds ?? []).catch(() => []),
      api.get(`/stores/${storeId}`).then((r) => (r.data?.data ?? r.data)?.themeId ?? null).catch(() => null),
    ]).then(([m, p, ids, active]) => { setMine(m); setPlan(p); setPlanIds(ids); setActiveId(active); });
  }, [storeId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/theme/type').then((r) => setTypes(r.data ?? [])).catch(() => {}); }, []);
  useEffect(() => {
    if (tab !== 'gallery') return;
    setGallery(null);
    api.get('/theme', { params: { type } }).then((r) => setGallery(r.data?.data ?? [])).catch(() => setGallery([]));
  }, [tab, type]);

  const activate = async (th, viaPlan) => {
    const id = th?.id ?? null;
    setBusy(id ?? 'default');
    try {
      await api.post(viaPlan ? '/theme/active-theme-plan' : '/theme/active-theme', { themeId: id, storeId });
      setActiveId(id);
      toast.success(t('themes.activated'));
    } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };
  const install = async (th) => {
    if (Number(th.price) > 0) return setBuying(th);
    setBusy(th.id);
    try { await api.post(`/theme/install-theme/${th.id}`, {}); toast.success(t('themes.installed_ok')); load(); } catch (e) { toast.error(errorMessage(e, t('inventory.error'))); } finally { setBusy(null); }
  };

  const ctx = { activeId, myIds: (mine ?? []).map((m) => m.id), planIds };
  const active = [...(mine ?? []), ...plan].find((m) => m.id === activeId);
  const planOnly = plan.filter((p) => !(mine ?? []).some((m) => m.id === p.id));
  const btn = 'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold disabled:opacity-50';
  const ActiveTag = <span className={`${btn} bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600`}><Check className="w-3.5 h-3.5" />{t('themes.active')}</span>;

  const myCard = (th, viaPlan) => (
    <div key={th?.id ?? 'default'} className={`rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border ${(th?.id ?? null) === activeId ? 'border-emerald-400 dark:border-emerald-500/50' : 'border-gray-100 dark:border-zinc-800'}`}>
      <Thumb src={th?.imageUrl} />
      <div className="p-2.5 space-y-2">
        <p className="text-xs font-bold truncate flex items-center gap-1">{viaPlan && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}<bdi>{th ? themeName(th, i18n.language) : t('themes.default')}</bdi></p>
        {(th?.id ?? null) === activeId ? ActiveTag : (
          <button type="button" disabled={!!busy} onClick={() => activate(th, viaPlan)} className={`${btn} bg-indigo-600 text-white`}>
            {busy === (th?.id ?? 'default') && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{t('themes.activate')}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {/* الثيم الحالي */}
      <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-3">
        <span className="w-14 h-11 rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0">{active?.imageUrl && <img src={active.imageUrl} alt="" className="w-full h-full object-cover object-top" />}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400">{t('themes.current')}</p>
          <p className="text-sm font-bold truncate"><bdi>{mine === null ? '…' : active ? themeName(active, i18n.language) : t('themes.default')}</bdi></p>
        </div>
        {store?.subdomain && <a href={`https://${store.subdomain}.mdstore.top`} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-indigo-500"><ExternalLink className="w-4 h-4" /></a>}
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-900">
        {['my', 'gallery'].map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`py-2 rounded-lg text-sm font-bold ${tab === k ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'text-gray-500'}`}>{t(`themes.tab_${k}`)}</button>
        ))}
      </div>

      {tab === 'my' && (mine === null
        ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : (
          // قسمان: ما يملكه التاجر (اشتراه/ثبّته) — وما تعطيه خطته (يزول بانتهاء الاشتراك)
          <div className="space-y-4">
            <section className="space-y-2">
              <p className="text-sm font-bold">{t('themes.section_mine')} <span className="text-gray-400 font-semibold" dir="ltr">({mine.length + 1})</span></p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {myCard(null)}
                {mine.map((th) => myCard(th))}
              </div>
            </section>
            {planOnly.length > 0 && (
              <section className="space-y-2">
                <div>
                  <p className="text-sm font-bold flex items-center gap-1.5"><Crown className="w-4 h-4 text-amber-500" />{t('themes.section_plan')} <span className="text-gray-400 font-semibold" dir="ltr">({planOnly.length})</span></p>
                  <p className="text-[11px] text-gray-400">{t('themes.section_plan_hint')}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {planOnly.map((th) => myCard(th, true))}
                </div>
              </section>
            )}
          </div>
        ))}

      {tab === 'gallery' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none]">
            {[{ id: '', name: t('themes.all') }, ...types].map((ty) => (
              <button key={ty.id || 'all'} type="button" onClick={() => setType(ty.id)} className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border ${type === ty.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300'}`}>{ty.name}</button>
            ))}
          </div>
          {gallery === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            : gallery.length === 0 ? <p className="text-center text-sm text-gray-400 py-12">{t('themes.empty')}</p>
            : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {gallery.map((th) => {
                  const st = themeStatus(th, ctx);
                  return (
                    <div key={th.id} className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800">
                      <div className="relative">
                        <Thumb src={th.imageUrl} />
                        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${st === 'plan' ? 'bg-amber-500 text-white' : Number(th.price) > 0 ? 'bg-white/90 text-gray-900' : 'bg-emerald-500 text-white'}`} dir="ltr">
                          {st === 'plan' ? t('themes.in_plan') : Number(th.price) > 0 ? `${money(th.price)} DA` : t('themes.free')}
                        </span>
                        <a href={`${PREVIEW}${th.slug}`} target="_blank" rel="noreferrer" className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 text-white"><ExternalLink className="w-3.5 h-3.5" /></a>
                      </div>
                      <div className="p-2.5 space-y-2">
                        <p className="text-xs font-bold truncate"><bdi>{themeName(th, i18n.language)}</bdi></p>
                        {st === 'active' ? ActiveTag
                          : st === 'installed' ? <button type="button" disabled={!!busy} onClick={() => activate(th)} className={`${btn} bg-gray-100 dark:bg-zinc-800`}>{t('themes.activate')}</button>
                          : st === 'plan' ? <button type="button" disabled={!!busy} onClick={() => activate(th, true)} className={`${btn} bg-amber-500 text-white`}>{busy === th.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{t('themes.activate')}</button>
                          : <button type="button" disabled={!!busy} onClick={() => install(th)} className={`${btn} bg-indigo-600 text-white`}>{busy === th.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{st === 'paid' ? t('themes.buy') : t('themes.install')}</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </>
      )}

      {buying && <BuySheet theme={buying} onClose={() => setBuying(null)} onBought={() => { setBuying(null); load(); setTab('my'); }} />}
    </div>
  );
}
