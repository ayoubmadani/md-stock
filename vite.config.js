import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// تجربة الهاتف محلياً (npm run dev:phone): الكاميرا تحتاج https — شهادة محلية،
// والـ API يمرّ عبر /api في نفس العنوان (صفحة https لا تتصل بـ http مباشرة)
const phone = process.env.PHONE === '1';

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(phone ? [basicSsl()] : [])],
  server: phone
    ? { proxy: { '/api': { target: 'http://localhost:7000', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') } } }
    : undefined,
  test: { environment: 'jsdom' },
});
