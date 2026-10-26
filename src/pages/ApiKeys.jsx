// مفاتيح الربط (API / MCP): إنشاء مفتاح يظهر مرة واحدة مع رابط الربط بـ Claude / ChatGPT، والقائمة مع الإلغاء
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, Copy, Eye, EyeOff, KeyRound, Loader2, Plus, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { input, label } from '../components/product';

const MCP_URL = 'https://mcp.mdstore.top/mcp';
const box = 'rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80';
const STATUS = { active: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600', expired: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600', revoked: 'bg-gray-100 dark:bg-zinc-800 text-gray-500' };
// اسم العميل كما يرسله (claude-ai 1.0…) ← اسم مقروء
const clientLabel = (c = '') => (/claude/i.test(c) ? 'Claude' : /openai|chatgpt/i.test(c) ? 'ChatGPT' : /gemini/i.test(c) ? 'Gemini' : c);

function CopyRow({ label: l, value, secret }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(!secret);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { toast.error(t('keys.copy_failed')); }
  };
  const share = () => navigator.share?.({ text: value }).catch(() => {});
  return (
    <div className="space-y-1.5">
      <p className={label}>{l}</p>
      <div className="flex items-center gap-1.5 p-2 rounded-xl bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800">
        <code dir="ltr" className="flex-1 min-w-0 text-[11px] font-mono break-all text-start">{show ? value : `${value.slice(0, 12)}${'•'.repeat(16)}`}</code>
        {secret && <button type="button" onClick={() => setShow((v) => !v)} className="p-2 rounded-lg text-gray-400">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
        {navigator.share && <button type="button" onClick={share} className="p-2 rounded-lg text-gray-400"><Share2 className="w-4 h-4" /></button>}
        <button type="button" onClick={copy} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold ${copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? t('keys.copied') : t('keys.copy')}
        </button>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const { t, i18n } = useTranslation();
  const [keys, setKeys] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(null);
  const [newKey, setNewKey] = useState(null);

  const load = useCallback(() => { api.get('/api-keys').then((r) => setKeys(Array.isArray(r.data) ? r.data : r.data?.data ?? [])).catch(() => setKeys([])); }, []);
  useEffect(() => { load(); }, [load]);
  const date = (d) => (d ? new Date(d).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

  const create = async (e) => {
    e.preventDefault();
    setBusy('create');
    try {
      const { data } = await api.post('/api-keys', { name: name.trim(), expiresInDays: Number(days) });
      setNewKey(data.key); setName(''); setCreating(false); load();
    } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); } finally { setBusy(null); }
  };
  const revoke = async (k) => {
    if (!window.confirm(t('keys.revoke_q'))) return;
    setBusy(k.id);
    try { await api.delete(`/api-keys/${k.id}`); load(); } catch (err) { toast.error(errorMessage(err, t('inventory.error'))); } finally { setBusy(null); }
  };

  return (
    <div className="max-w-xl mx-auto space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-bold">{t('nav.keys')}</h1>
        <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold"><Plus className="w-4 h-4" />{t('keys.new')}</button>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed px-1">{t('keys.hint')}</p>

      {keys === null ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        : keys.length === 0 ? <div className="flex flex-col items-center gap-3 py-14 text-gray-400"><KeyRound className="w-10 h-10" /><p className="text-sm">{t('keys.empty')}</p></div>
        : (
          <div className={`${box} divide-y divide-gray-100 dark:divide-zinc-800`}>
            {keys.map((k) => (
              <div key={k.id} className="p-3 flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0"><KeyRound className="w-5 h-5" /></span>
                <div className="flex-1 min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold"><span className="truncate"><bdi>{k.name}</bdi></span>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${STATUS[k.status] || STATUS.revoked}`}>{t(`keys.status_${k.status}`)}</span>
                  </p>
                  <code dir="ltr" className="block text-[11px] font-mono text-gray-400 rtl:text-right">{k.prefix}…</code>
                  {k.connectedClient && <p className="text-[11px] font-semibold text-violet-600">{t('keys.connected_with', { client: clientLabel(k.connectedClient) })}</p>}
                  <p className="text-[11px] text-gray-400">{t('keys.last_used')}: {date(k.lastUsedAt) || t('keys.never')} · {t('keys.expires')}: {date(k.expiresAt)}</p>
                </div>
                {k.status !== 'revoked' && (
                  <button type="button" disabled={busy === k.id} onClick={() => revoke(k)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 disabled:opacity-50">
                    {busy === k.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('keys.revoke')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && setCreating(false)}>
          <form onSubmit={create} className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between"><p className="font-bold">{t('keys.new')}</p><button type="button" onClick={() => setCreating(false)} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
            <div className="space-y-1.5"><label className={label}>{t('keys.name')}</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('keys.name_ph')} className={input} autoFocus /></div>
            <div className="space-y-1.5"><label className={label}>{t('keys.validity')}</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[30, 90, 180, 365].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={`py-2 rounded-lg text-xs font-bold ${days === d ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'}`}>{t('keys.days', { count: d })}</button>)}
              </div>
            </div>
            <button disabled={busy === 'create' || !name.trim()} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
              {busy === 'create' && <Loader2 className="w-4 h-4 animate-spin" />}{t('keys.create')}
            </button>
          </form>
        </div>
      )}

      {/* المفتاح الجديد يظهر مرة واحدة */}
      {newKey && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 max-h-[92dvh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <p className="flex items-center gap-2 font-bold text-emerald-600"><Check className="w-5 h-5" />{t('keys.created')}</p>
            <p className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs leading-relaxed"><AlertTriangle className="w-4 h-4 shrink-0" />{t('keys.once')}</p>
            <CopyRow label={t('keys.mcp')} value={`${MCP_URL}/${newKey}`} secret />
            <p className="text-[11px] text-gray-400 leading-relaxed">{t('keys.mcp_hint')}</p>
            <CopyRow label={t('keys.key')} value={newKey} secret />
            <button type="button" onClick={() => setNewKey(null)} className="w-full py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold">{t('keys.done')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
