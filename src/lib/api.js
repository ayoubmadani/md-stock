import axios from 'axios';

// جلسة تطبيق المخزون (منفصلة عن لوحة التاجر — نفس الحساب ونفس الـ API)
const TOKEN_KEY = 'stock_token';
const STORE_KEY = 'stock_store';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* وضع خاص */ } };

export const getToken = () => read(TOKEN_KEY);
export const setToken = (t) => write(TOKEN_KEY, t);
export const getStoreId = () => read(STORE_KEY);
export const setStoreId = (id) => write(STORE_KEY, id);

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// انتهت الجلسة → صفحة الدخول
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && getToken()) {
      setToken(null);
      window.location.assign('/login');
    }
    return Promise.reject(err);
  },
);

/** رسالة خطأ مقروءة من رد الـ API */
export const errorMessage = (err, fallback) => {
  const msg = err?.response?.data?.message;
  if (Array.isArray(msg)) return msg[0];
  if (typeof msg === 'string') return msg;
  if (msg?.message) return msg.message;
  return fallback;
};
