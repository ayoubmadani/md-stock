import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getStoreId, getToken, setStoreId, setToken } from './api';

const AuthContext = createContext(null);

// متاجر يستطيع إدارة مخزونها: المالك، أو عضو له صلاحية المنتجات
export const canManageStock = (s) => s.role === 'owner' || (s.permissions || []).includes('product.crud') || (s.permissions || []).includes('*');

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [stores, setStores] = useState([]);
  const [storeId, setStoreIdState] = useState(getStoreId());
  const [loading, setLoading] = useState(!!getToken());

  const refresh = useCallback(async () => {
    if (!getToken()) { setStores([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/stores/user/me');
      const list = (data?.stores || data?.data || data || []).filter?.((s) => s.selectable !== false && canManageStock(s)) ?? [];
      setStores(list);
      const keep = list.find((s) => s.id === getStoreId());
      const next = keep?.id || list[0]?.id || null;
      setStoreId(next);
      setStoreIdState(next);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [token, refresh]);

  const login = (newToken, preferredStoreId) => {
    if (preferredStoreId) setStoreId(preferredStoreId);
    setToken(newToken);
    setTokenState(newToken);
  };
  const logout = () => { setToken(null); setTokenState(null); setStores([]); };
  const selectStore = (id) => { setStoreId(id); setStoreIdState(id); };

  return (
    <AuthContext.Provider value={{ token, stores, storeId, store: stores.find((s) => s.id === storeId) || null, loading, login, logout, selectStore, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
