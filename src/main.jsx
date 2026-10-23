import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './index.css';
import App from './App.jsx';

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
