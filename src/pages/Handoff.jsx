// دخول سريع من لوحة التاجر: /handoff?code=…&store=… — رمز لمرة واحدة يُستبدل بجلسة
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function Handoff() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode يستدعي الأثر مرتين — الرمز لمرة واحدة
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const store = params.get('store');
    window.history.replaceState(null, '', '/handoff'); // لا يبقى الرمز في الرابط أو السجل
    if (!code) { setFailed(true); return; }
    api.post('/auth/handoff/redeem', { code })
      .then(({ data }) => { login(data.access_token, store); window.location.replace('/'); })
      .catch(() => setFailed(true));
  }, [login]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center">
      {failed ? (
        <>
          <p className="text-gray-600 dark:text-zinc-300 max-w-xs">{t('handoff.failed')}</p>
          <Link to="/login" className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold">{t('login.submit')}</Link>
        </>
      ) : (
        <>
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500">{t('handoff.loading')}</p>
        </>
      )}
    </div>
  );
}
