import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './index.css';
import App from './App.jsx';
import { registerSw } from './lib/push';
import { playCoin, unlockAudio } from './lib/coin';

// الوضع الليلي افتراضياً — يبقى اختيار المستخدم
try {
  if (localStorage.getItem('stock_theme') === 'light') document.documentElement.classList.remove('dark');
} catch { /* وضع خاص */ }

// خانات الأرقام: عجلة الفأرة لا تغيّر القيمة
document.addEventListener('wheel', () => {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement && el.type === 'number') el.blur();
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// إشعارات الطلبات تصل حتى والتطبيق مغلق
registerSw();

// طلب جديد والتطبيق مفتوح: صوت العملة
unlockAudio();
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'push') playCoin();
});
