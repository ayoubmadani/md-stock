// تحت «الثيم الحالي»: ألوان المتجر (إن كان الثيم يتبعها) + ملاحظات ليظهر الثيم جيداً — نفس إطار لوحة التحكم
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Lightbulb, Palette } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { PRESET_COLORS, themeColorSupport, themeNotes } from '../lib/themePanel';

// كود الثيم المنشور (نفس ملف المتجر) — لمعرفة هل يتبع ألوان المتجر
const THEMES_ORIGIN = import.meta.env.VITE_THEMES_ORIGIN || 'https://mdstore.top';
const HEX = /^#[0-9a-f]{6}$/i;

function ColorRow({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold text-gray-500">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} aria-label={c}
            className={`w-7 h-7 rounded-full ${value?.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-zinc-900' : 'ring-1 ring-black/10 dark:ring-white/10'}`}
            style={{ background: c }} />
        ))}
        <label className="relative w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/15 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]">
          <input type="color" value={HEX.test(value || '') ? value : '#000000'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0" />
        </label>
      </div>
    </div>
  );
}

export default function ActiveThemePanel({ theme, store, storeId, onStoreChange }) {
  const { t, i18n } = useTranslation();
  const [support, setSupport] = useState({ primary: false, secondary: false });
  const [primary, setPrimary] = useState(store?.design?.primaryColor || '#4F46E5');
  const [secondary, setSecondary] = useState(store?.design?.secondaryColor || '#F59E0B');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    setPrimary(store?.design?.primaryColor || '#4F46E5');
    setSecondary(store?.design?.secondaryColor || '#F59E0B');
  }, [store?.design?.primaryColor, store?.design?.secondaryColor]);

  useEffect(() => {
    let alive = true;
    if (!theme?.slug) return undefined;
    fetch(`${THEMES_ORIGIN}/api/themes/${theme.slug}`).then((r) => (r.ok ? r.text() : '')).then((code) => { if (alive) setSupport(themeColorSupport(code)); }).catch(() => {});
    return () => { alive = false; };
  }, [theme?.slug]);

  useEffect(() => {
    let alive = true;
    if (!storeId) return undefined;
    Promise.all([
      api.get(`/stores/${storeId}/products`, { params: { page: 1, limit: 100 } }).catch(() => ({ data: {} })),
      api.get(`/stores/${storeId}/categories`).catch(() => ({ data: [] })),
      theme?.id ? api.get(`/theme/${theme.id}/notes`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]).then(([p, c, tn]) => {
      if (!alive) return;
      setNotes(themeNotes({
        store,
        products: p.data?.products || [],
        productsTotal: p.data?.total ?? (p.data?.products || []).length,
        categories: Array.isArray(c.data) ? c.data : [],
        adminNotes: Array.isArray(tn.data) ? tn.data : [],
        lang: i18n.language,
      }));
    });
    return () => { alive = false; };
  }, [storeId, store, theme?.id, i18n.language]);

  const dirty = primary !== (store?.design?.primaryColor || '#4F46E5') || (support.secondary && secondary !== (store?.design?.secondaryColor || '#F59E0B'));
  const saveColors = async () => {
    setSaving(true);
    try {
      const design = { primaryColor: primary, ...(support.secondary ? { secondaryColor: secondary } : {}) };
      await api.patch(`/stores/${storeId}`, { design });
      onStoreChange?.({ ...store, design: { ...(store?.design || {}), ...design } });
      toast.success(t('themes.panel.colors_saved'));
    } catch (e) { toast.error(errorMessage(e, t('themes.panel.colors_error'))); } finally { setSaving(false); }
  };

  const link = { logo: `/stores/${storeId}`, hero: `/stores/${storeId}`, products: '/stock', categories: '/categories' };

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-3 space-y-4">
      {support.primary ? (
        <div className="space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-black"><Palette className="w-3.5 h-3.5" /> {t('themes.panel.colors_title')}</p>
          <ColorRow label={t('themes.panel.primary')} value={primary} onChange={setPrimary} />
          {support.secondary && <ColorRow label={t('themes.panel.secondary')} value={secondary} onChange={setSecondary} />}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1.5 rounded-lg text-white text-xs font-bold" style={{ background: primary }}>{t('themes.panel.preview_button')}</span>
            <span className="text-sm font-black" style={{ color: primary }}>2,500 DZD</span>
            {support.secondary && <span className="px-2 py-0.5 rounded-full text-white text-[11px] font-bold" style={{ background: secondary }}>{t('themes.panel.preview_badge')}</span>}
            <button type="button" onClick={saveColors} disabled={!dirty || saving} className="ms-auto px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-40">
              {saving ? '…' : t('themes.panel.save')}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" /> {t('themes.panel.fixed_colors')}</p>
      )}

      {notes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-black">{t('themes.panel.notes_title')}</p>
          {notes.map((n) => n.key === 'tip' ? (
            <p key={`tip-${n.text}`} className="flex items-start gap-2 text-xs text-indigo-600 dark:text-indigo-300"><Lightbulb className="w-4 h-4 shrink-0" /> {n.text}</p>
          ) : (
            <div key={n.key} className="flex items-center gap-2 text-xs">
              {n.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
              <span className={n.ok ? 'text-gray-500' : 'font-semibold'}>{t(`themes.panel.note_${n.key}_${n.ok ? 'ok' : n.empty ? 'empty' : 'missing'}`, { count: n.count })}</span>
              {!n.ok && <Link to={link[n.key]} className="ms-auto text-indigo-600 dark:text-indigo-400 font-bold">{t('themes.panel.fix')}</Link>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
