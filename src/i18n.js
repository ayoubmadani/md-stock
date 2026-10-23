import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar/translation.json';
import fr from './locales/fr/translation.json';
import en from './locales/en/translation.json';

const saved = (() => { try { return localStorage.getItem('stock_lang'); } catch { return null; } })();

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, fr: { translation: fr }, en: { translation: en } },
  lng: saved || 'ar',
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
});

// اتجاه الصفحة يتبع اللغة
const applyDir = (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
};
applyDir(i18n.language);
i18n.on('languageChanged', (lng) => {
  applyDir(lng);
  try { localStorage.setItem('stock_lang', lng); } catch { /* وضع خاص */ }
});

export default i18n;
