// المحفظة على الهاتف: الرصيد، الشحن (بطاقة / Binance Pay / USDT BEP20)، وسجل العمليات — نفس محفظة لوحة التاجر
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowUpCircle, Check, CheckCircle2, Copy, CreditCard, ExternalLink, Loader2, Plus, ShoppingBag, Wallet as WalletIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '../lib/api';
import { money } from '../lib/orders';
import { openBinance } from '../lib/binance-link';

const PRESETS = [2500, 5000, 7500, 10000];
const MIN = 100;
const input = 'w-full px-4 py-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl text-base outline-none focus:border-indigo-400';

function CopyRow({ label, value }) {
  const [done, setDone] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); } catch { /* */ } };
  return (
    <button type="button" onClick={copy} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="flex items-center gap-1.5 min-w-0 font-bold" dir="ltr"><span className="truncate">{value}</span>{done ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 text-gray-300 shrink-0" />}</span>
    </button>
  );
}

// بطاقة (Chargily): المبلغ ← صفحة الدفع ← الرجوع إلى هنا
function CardTopUp() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const pay = async () => {
    const n = Number(amount);
    if (!(n >= MIN)) return toast.error(t('wallet.min', { min: MIN }));
    setBusy(true);
    try {
      const { data } = await api.post('/payment/top-up', { amount: n, app: 'mobile' });
      if (data?.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (e) {
      toast.error(errorMessage(e, t('wallet.top_up_failed')));
      setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setAmount(String(p))}
            className={`py-3 rounded-xl border text-sm font-bold ${Number(amount) === p ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-zinc-800'}`} dir="ltr">
            {money(p)} DA
          </button>
        ))}
      </div>
      <div className="relative">
        <input type="number" inputMode="numeric" dir="ltr" min={MIN} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('wallet.custom')} className={`${input} pe-12`} />
        <span className="absolute end-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">DA</span>
      </div>
      <button type="button" onClick={pay} disabled={busy || !amount} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}{t('wallet.pay_card')}
      </button>
      <p className="text-[11px] text-gray-400 text-center">{t('wallet.card_note')}</p>
    </div>
  );
}

// Binance: Pay (UID) أو USDT على شبكة BSC — يحوّل ثم يُدخل رقم المعاملة
function BinanceTopUp({ config, via, onPaid }) {
  const { t } = useTranslation();
  const [dzd, setDzd] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const usdt = Number(dzd) > 0 ? Math.ceil((Number(dzd) / config.rate) * 100) / 100 : null;
  const bsc = config.addresses?.BSC || null;
  const qr = via === 'bsc' ? bsc : config.payLink || null;

  const claim = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/payment/binance/claim', { txId: code.trim() });
      onPaid(data.amountDzd);
    } catch (e) {
      toast.error(errorMessage(e, t('wallet.binance.error')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500">{t('wallet.binance.calc_label')}</label>
        <div className="flex items-center gap-2">
          <input type="number" inputMode="numeric" dir="ltr" value={dzd} onChange={(e) => setDzd(e.target.value)} placeholder="1000" className={`${input} flex-1 min-w-0`} />
          <span className="shrink-0 px-3 py-3 rounded-xl bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 font-black text-sm" dir="ltr">${usdt != null ? usdt.toFixed(2) : '0.00'}</span>
        </div>
        <p className="text-[11px] text-gray-400" dir="ltr" style={{ textAlign: 'start' }}>1 USDT = {config.rate} DA</p>
      </div>
      {qr && <div className="mx-auto w-fit p-3 bg-white rounded-2xl"><QRCodeSVG value={qr} size={168} level="M" /></div>}
      <div className="rounded-xl border border-gray-200 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
        <CopyRow label={via === 'bsc' ? t('wallet.binance.bsc_network') : t('wallet.binance.pay_method')} value={via === 'bsc' ? 'BNB Smart Chain (BEP20)' : 'Binance Pay (UID)'} />
        {via === 'bsc' && bsc && <CopyRow label="BEP20" value={bsc} />}
        {via === 'pay' && config.uid && <CopyRow label="UID" value={config.uid} />}
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed">{via === 'bsc' ? t('wallet.binance.bsc_note') : t('wallet.binance.scan_or_uid')}</p>
      {/* تطبيق Binance مباشرة (لا تبويب جديد — الهاتف لا يفتح التطبيقات من تبويب جديد) */}
      <button type="button" onClick={() => openBinance(via === 'bsc' ? 'https://www.binance.com/my/wallet/account/main/withdrawal/crypto/USDT' : config.payLink)}
        className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#FCD535] text-gray-900 text-sm font-bold">
        <ExternalLink className="w-4 h-4" />{via === 'bsc' ? t('wallet.binance.open_withdraw') : t('wallet.binance.open_binance')}
      </button>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-500">{t('wallet.binance.txid')}</label>
        <input dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder={via === 'bsc' ? t('wallet.binance.txid_placeholder_bsc') : t('wallet.binance.txid_placeholder')} className={input} />
      </div>
      <button type="button" onClick={claim} disabled={busy || !code.trim()} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}{t('wallet.binance.confirm')}
      </button>
      <p className="text-[11px] text-gray-400 text-center">{via === 'bsc' ? t('wallet.binance.hint_bsc') : t('wallet.binance.hint')}</p>
    </div>
  );
}

function TopUpSheet({ binance, onClose, onPaid }) {
  const { t } = useTranslation();
  const tabs = ['card', ...(binance?.enabled ? ['pay', 'bsc'] : [])];
  const [tab, setTab] = useState('card');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 pb-2">
          <p className="font-bold">{t('wallet.top_up')}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        {tabs.length > 1 && (
          <div className="px-4">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-zinc-800">
              {tabs.map((k) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`py-2 rounded-lg text-xs font-bold ${tab === k ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'text-gray-500'}`}>
                  {t(`wallet.tab_${k}`)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {tab === 'card' ? <CardTopUp /> : <BinanceTopUp key={tab} config={binance} via={tab} onPaid={onPaid} />}
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [binance, setBinance] = useState(null);
  const [sheet, setSheet] = useState(false);

  const load = useCallback(() => {
    api.get('/payment/balance').then((r) => setData(r.data)).catch(() => setData({ balance: 0, user: { transactions: [] } }));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/payment/binance/config').then((r) => setBinance(r.data)).catch(() => setBinance(null)); }, []);

  // الرجوع من صفحة الدفع بالبطاقة
  useEffect(() => {
    const p = params.get('payment');
    if (p !== 'success' && p !== 'failed') return;
    if (p === 'success') { toast.success(t('wallet.paid', { amount: money(params.get('amount')) })); load(); } else toast.error(t('wallet.payment_failed'));
    setParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;

  const txs = (data.user?.transactions ?? []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const sum = (action) => txs.filter((x) => x.action === action).reduce((s, x) => s + Number(x.amount), 0);
  const date = (d) => new Date(d).toLocaleString(i18n.language === 'ar' ? 'ar-DZ' : i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-xl mx-auto space-y-3">
      {/* الرصيد */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white space-y-4">
        <div className="flex items-center gap-2 text-sm text-white/80"><WalletIcon className="w-4 h-4" />{t('wallet.balance')}</div>
        <p className="text-4xl font-black" dir="ltr" style={{ textAlign: 'start' }}>{money(data.balance)} <span className="text-xl font-bold text-white/70">DA</span></p>
        <button type="button" onClick={() => setSheet(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-indigo-700 font-bold">
          <Plus className="w-4 h-4" />{t('wallet.top_up')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4">
          <p className="text-xs text-gray-500">{t('wallet.total_in')}</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1" dir="ltr">+{money(sum('deposit'))}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 p-4">
          <p className="text-xs text-gray-500">{t('wallet.total_out')}</p>
          <p className="text-lg font-bold text-rose-500 mt-1" dir="ltr">-{money(sum('payment'))}</p>
        </div>
      </div>

      {/* العمليات */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 divide-y divide-gray-100 dark:divide-zinc-800">
        <p className="px-4 py-3 font-bold text-sm">{t('wallet.history')}</p>
        {txs.length === 0 && <p className="text-center text-sm text-gray-400 py-10">{t('wallet.empty')}</p>}
        {txs.map((x) => {
          const credit = x.action === 'deposit';
          const Icon = credit ? ArrowUpCircle : ShoppingBag;
          const item = x.theme ? (x.theme[`name_${i18n.language}`] || x.theme.name_ar) : x.plan?.name;
          return (
            <div key={x.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${credit ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}><Icon className="w-4 h-4" /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {t(`wallet.action.${x.action}`, x.action)}
                  {x.type && x.type !== 'wallet' && <span className="text-xs text-gray-400 font-normal"> · {t(`wallet.type.${x.type}`, x.type)}{item ? ` (${item})` : ''}</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{date(x.createdAt)}</p>
              </div>
              <span className={`text-sm font-black shrink-0 ${credit ? 'text-emerald-500' : 'text-rose-500'}`} dir="ltr">{credit ? '+' : '-'}{money(x.amount)}</span>
            </div>
          );
        })}
      </div>

      {sheet && <TopUpSheet binance={binance} onClose={() => setSheet(false)} onPaid={(amt) => { setSheet(false); toast.success(t('wallet.paid', { amount: money(amt) })); load(); }} />}
    </div>
  );
}
