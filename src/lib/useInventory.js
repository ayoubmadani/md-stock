import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

// بيانات المخزون للمتجر المختار — نفس رابط صفحة المخزون في لوحة التاجر
export function useInventory(storeId) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    if (!storeId) return;
    api.get(`/stores/${storeId}/inventory`)
      .then((r) => { setData(r.data); setError(false); })
      .catch(() => setError(true));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async (productId, patch) => {
    await api.patch(`/stores/${storeId}/inventory/products/${productId}`, patch).catch(() => {});
    load();
  };

  return { data, error, reload: load, saveSettings };
}
