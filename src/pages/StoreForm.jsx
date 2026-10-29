// إنشاء/تعديل متجر — نفس جسم اللوحة: الاسم، الشعار والألوان، التواصل، اللغة والعملة، السلة والتوصيل، الشريط العلوي والغلاف
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EMPTY_STORE, generateSubdomain, storePayload, storeToForm } from '../lib/store-form';
import ImageLibrary from '../components/ImageLibrary';
import { Section, Toggle, input, label } from '../components/product';

function ImagePick({ value, onPick, onClear, wide, small, fill }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative ${fill ? 'w-full' : 'flex items-center gap-3'}`}>
      <button type="button" onClick={() => setOpen(true)} className={`${wide ? 'w-full aspect-[16/7]' : fill ? 'w-full h-20 p-1.5' : small ? 'w-12 h-12' : 'w-20 h-20'} rounded-xl border-2 border-dashed border-gray-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-zinc-950`}>
        {value ? <img src={value} alt="" className={`w-full h-full ${wide ? 'object-cover' : 'object-contain'}`} /> : <ImagePlus className="w-6 h-6" />}
      </button>
      {value && !wide && <button type="button" onClick={onClear} className={fill ? 'absolute -top-2 -end-2 w-6 h-6 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center' : 'text-xs text-rose-500'}>✕</button>}
      {open && <ImageLibrary folder="store" max={1} onPick={([u]) => { setOpen(false); onPick(u); }} onClose={() => setOpen(false)} />}
    </div>
  );
}

// معاينة أعلى الموقع: الشعار، واسم المتجر بجانبه إذا فُعّل (أو الاسم وحده بدون شعار كما تفعل الثيمات)
function LogoPreview({ f, label, hint }) {
  if (!f.logo && !f.name.trim()) return null;
  const name = f.name.trim() && (f.showStoreName || !f.logo) ? f.name.trim() : '';
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold text-gray-400">{label}</p>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-white text-gray-900 border border-gray-200 dark:border-zinc-700 px-3 h-14">
        <span className="flex items-center gap-2.5 min-w-0">
          {f.logo && <img src={f.logo} alt="" className="h-8 max-w-[140px] object-contain shrink-0" />}
          {name && <span className="font-extrabold truncate">{name}</span>}
        </span>
        <span className="flex gap-1.5 shrink-0">{[0, 1, 2].map((i) => <span key={i} className="w-7 h-7 rounded-lg bg-gray-100" />)}</span>
      </div>
      <p className="text-[11px] text-gray-400">{hint}</p>
    </div>
  );
}

// onboarding: أول متجر لحساب جديد — بعد الإنشاء إلى الرئيسية
export default function StoreForm({ onboarding = false }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const isNew = onboarding || !id;
  const nav = useNavigate();
  const { refresh, selectStore } = useAuth();
  const [f, setF] = useState(isNew ? EMPTY_STORE : null);
  const [subdomain, setSubdomain] = useState('');
  const [wilayas, setWilayas] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v?.target ? (v.target.type === 'checkbox' ? v.target.checked : v.target.value) : v }));

  useEffect(() => {
    if (isNew) return;
    api.get(`/stores/${id}`).then(({ data }) => { const st = data?.data || data; setF(storeToForm(st)); setSubdomain(st.subdomain); })
      .catch((e) => { toast.error(errorMessage(e, t('inventory.error'))); nav('/stores'); });
  }, [id, isNew, nav, t]);
  useEffect(() => {
    if (!f?.country) return;
    api.get('/shipping/wilayas', { params: { country: f.country } }).then(({ data }) => setWilayas(Array.isArray(data) ? data : [])).catch(() => setWilayas([]));
  }, [f?.country]);

  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return toast.error(t('stores.name_required'));
    setSaving(true);
    try {
      if (isNew) {
        const { data } = await api.post('/stores/create-full', storePayload(f, { subdomain: generateSubdomain(f.name) }));
        toast.success(t('stores.created'));
        await refresh();
        const newId = data?.data?.id;
        if (newId) selectStore(newId);
      } else {
        await api.patch(`/stores/${id}`, storePayload(f, { subdomain }));
        toast.success(t('inventory.saved'));
        await refresh();
      }
      nav(onboarding ? '/' : '/stores');
    } catch (err) {
      toast.error(errorMessage(err, t('inventory.error')));
      setSaving(false);
    }
  };

  if (!f) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  return (
    <form onSubmit={save} className="max-w-xl mx-auto space-y-3">
      {!onboarding && (
        <div className="flex items-center justify-between">
          <h1 className="font-bold">{isNew ? t('stores.new') : t('stores.edit')}</h1>
          <button type="button" onClick={() => nav('/stores')} className="p-2 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
      )}

      <Section title={t('stores.identity')}>
        <Toggle checked={f.showStoreName} onChange={set('showStoreName')}>{t('stores.show_name')}</Toggle>
        <div className="grid grid-cols-2 gap-3">
          {[['logo', t('stores.logo')], ['favicon', t('stores.favicon'), t('stores.favicon_hint')]].map(([k, title, hint]) => (
            <div key={k} className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 p-3 text-center">
              <ImagePick value={f[k]} onPick={set(k)} onClear={() => set(k)(null)} fill />
              <p className="text-sm font-semibold">{title}</p>
              {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className={label}>{t('stores.name')}</label>
          <input value={f.name} onChange={set('name')} className={input} autoFocus={isNew} />
          {!isNew && subdomain && <p className="text-[11px] text-gray-400" dir="ltr" style={{ textAlign: 'start' }}>{subdomain}.mdstore.top</p>}
        </div>
        <LogoPreview f={f} label={t('stores.site_preview')} hint={t('stores.site_preview_hint')} />
        <div className="grid grid-cols-2 gap-3">
          {['primaryColor', 'secondaryColor'].map((k) => (
            <label key={k} className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-zinc-800 p-2">
              <input type="color" value={f[k]} onChange={set(k)} className="w-9 h-9 rounded-lg border-0 bg-transparent p-0" />
              <span className="text-xs text-gray-500">{t(`stores.${k}`)}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title={t('stores.contact')}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={label}>{t('stores.phone')}</label><input type="tel" dir="ltr" value={f.phone} onChange={set('phone')} className={input} /></div>
          <div className="space-y-1.5"><label className={label}>WhatsApp</label><input type="tel" dir="ltr" value={f.whatsapp} onChange={set('whatsapp')} className={input} /></div>
        </div>
        <div className="space-y-1.5"><label className={label}>Email</label><input type="email" dir="ltr" value={f.email} onChange={set('email')} className={input} /></div>
        <div className="space-y-1.5">
          <label className={label}>{t('stores.wilaya')}</label>
          <select value={f.wilaya} onChange={set('wilaya')} className={input}>
            <option value="">—</option>
            {wilayas.map((w) => <option key={w.id} value={w.name}>({w.id}) {w.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><label className={label}>{t('stores.address')}</label><input value={f.address} onChange={set('address')} className={input} /></div>
      </Section>

      <Section title={t('stores.selling')}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label className={label}>{t('stores.language')}</label>
            <select value={f.language} onChange={set('language')} className={input}>{['ar', 'fr', 'en'].map((l) => <option key={l} value={l}>{t(`stores.lang_${l}`)}</option>)}</select></div>
          <div className="space-y-1.5"><label className={label}>{t('stores.currency')}</label>
            <select value={f.currency} onChange={set('currency')} className={input}>{['DZD', 'EUR', 'USD', 'MAD', 'TND'].map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <Toggle checked={f.cart} onChange={set('cart')}>{t('stores.cart')}</Toggle>
        <Toggle checked={f.supportQty} onChange={set('supportQty')}>{t('stores.support_qty')}</Toggle>
        <Toggle checked={f.supportFreeShipping} onChange={set('supportFreeShipping')}>{t('stores.free_shipping')}</Toggle>
        {f.supportFreeShipping && (
          <div className="space-y-1.5"><label className={label}>{t('stores.free_min')}</label>
            <input type="number" inputMode="numeric" dir="ltr" min="0" value={f.freeShippingMinAmount} onChange={set('freeShippingMinAmount')} placeholder="0" className={input} /></div>
        )}
      </Section>

      <Section title={t('stores.look')}>
        <Toggle checked={f.showTopBar} onChange={set('showTopBar')}>{t('stores.top_bar')}</Toggle>
        {f.showTopBar && <input value={f.topBarText} onChange={set('topBarText')} placeholder={t('stores.top_bar_ph')} className={input} />}
        <div className="space-y-1.5">
          <label className={label}>{t('stores.hero')}</label>
          <ImagePick wide value={f.heroImage} onPick={set('heroImage')} />
          {f.heroImage && <button type="button" onClick={() => set('heroImage')(null)} className="text-xs text-rose-500">{t('stores.remove_image')}</button>}
        </div>
        <input value={f.heroTitle} onChange={set('heroTitle')} placeholder={t('stores.hero_title')} className={input} />
        <input value={f.heroSubtitle} onChange={set('heroSubtitle')} placeholder={t('stores.hero_subtitle')} className={input} />
      </Section>

      {/* يلتصق بأسفل الشاشة داخل عمود النموذج نفسه (فوق الشريط السفلي في الهاتف) */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 z-20 pt-2">
        <button disabled={saving} className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-60">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}{isNew ? t('stores.create') : t('inventory.save')}
        </button>
      </div>
    </form>
  );
}
