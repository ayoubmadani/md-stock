import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

// بيانات المخزون للمتجر المختار — نفس رابط صفحة المخزون في لوحة التاجر
export function useInventory(storeId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const current = useRef(storeId);

  const load = useCallback(() => {
    if (!storeId) return;
    api.get(`/stores/${storeId}/inventory`)
      .then((r) => { if (current.current === storeId) { setData(r.data); setError(false); } }) // رد متأخر من متجر سابق يُهمل
      .catch(() => { if (current.current === storeId) setError(true); });
  }, [storeId]);

  // متجر آخر: لا نعرض منتجات المتجر السابق ولو للحظة
  useEffect(() => { current.current = storeId; setData(null); load(); }, [storeId, load]);

  const saveSettings = async (productId, patch) => {
    await api.patch(`/stores/${storeId}/inventory/products/${productId}`, patch).catch(() => {});
    load();
  };

  return { data, error, reload: load, saveSettings };
}
