// مسح منتج: معروف ← بطاقته مع توريد/جرد، جديد ← إنشاء منتج بهذا الباركود
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Package, Plus, ClipboardCheck, ScanLine, PackagePlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import Scanner from '../components/Scanner';
import { AdjustModal, StatusBadge, VariantParts, fmt } from '../components/inventory';

const statusOf = (stock, threshold) => (stock <= 0 ? 'out' : stock <= threshold ? 'low' : 'ok');

export default function ScanPage() {
  const { t } = useTranslation();
  const { storeId, can } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState(null);
  const [hit, setHit] = useState(null); // { product, variant } | 'none' | null
  const [loading, setLoading] = useState(false);
  const [adjust, setAdjust] = useState(null);

  // منتج أولاً، ثم طلب (باركود الطلب أو رقم تتبع شركة التوصيل) — حسب صلاحيات العضو
  const lookup = useCallback(async (c) => {
    setCode(c);
    setLoading(true);
    const code = encodeURIComponent(c);
    try {
      if (can('product.crud')) {
        try {
          const { data } = await api.get(`/stores/${storeId}/inventory/barcode/${code}`);
          setHit(data);
          return;
        } catch (e) {
          if (e.response?.status !== 404) throw e;
        }
      }
      if (can('order.view')) {
        try {
          const { data } = await api.get(`/orders/scan/${storeId}/${code}`);
          navigate(`/orders/${data.id}?scanned=1`);
          return;
        } catch (e) {
          if (e.response?.status !== 404) throw e;
        }
      }
      setHit('none');
    } catch {
      setHit(null);
      toast.error(t('inventory.error'));
    } finally {
      setLoading(false);
    }
  }, [storeId, t, can, navigate]);

  const again = () => { setCode(null); setHit(null); };
  const stock = hit && hit !== 'none' ? (hit.variant ? hit.variant.stock : hit.product.stock) : 0;

  return (
    <div className="space-y-4 max-w-md mx-auto">
      {!code ? (
        <Scanner onDetected={lookup} />
      ) : (
        <div className="space-y-4">
          <p className="text-center text-xs text-gray-500" dir="ltr">{code}</p>
          {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}

          {!loading && hit === 'none' && (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-zinc-700 p-6 text-center space-y-4">
              <p className="text-gray-600 dark:text-zinc-300">{t('scan.unknown')}</p>
              {can('product.crud') && <button onClick={() => navigate(`/products/new?barcode=${encodeURIComponent(code)}`)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white font-bold">
                <PackagePlus className="w-5 h-5" />{t('scan.create')}
              </button>}
            </div>
          )}

          {!loading && hit && hit !== 'none' && (
            <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center">
                  {hit.product.image ? <img src={hit.product.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 text-gray-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{hit.product.name}</p>
                  {hit.variant && <VariantParts parts={hit.variant.parts} className="text-sm text-gray-500 mt-1" />}
                </div>
                <button onClick={() => navigate(`/products/${hit.product.id}`)} className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"><Pencil className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-zinc-950 p-3">
                <span className="text-sm text-gray-500">{t('inventory.col.stock')}</span>
                <span className="flex items-center gap-2"><StatusBadge status={statusOf(stock, hit.product.lowStockThreshold)} /><b className="text-2xl" dir="ltr">{fmt(stock)}</b></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setAdjust({ mode: 'add' })} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-bold"><Plus className="w-4 h-4" />{t('inventory.restock')}</button>
                <button onClick={() => setAdjust({ mode: 'set' })} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 font-bold"><ClipboardCheck className="w-4 h-4" />{t('inventory.count')}</button>
              </div>
            </div>
          )}

          <button onClick={again} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-zinc-800 font-semibold">
            <ScanLine className="w-4 h-4" />{t('scan.again')}
          </button>
        </div>
      )}

      {adjust && hit && hit !== 'none' && (
        <AdjustModal
          storeId={storeId}
          target={{ productId: hit.product.id, variantId: hit.variant?.id, name: hit.product.name, stock, mode: adjust.mode }}
          onClose={() => setAdjust(null)}
          onSaved={() => { setAdjust(null); toast.success(t('inventory.saved')); lookup(code); }}
        />
      )}
    </div>
  );
}
