import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getStoreId, getToken, setStoreId, setToken } from './api';
import { releasePush, syncPush } from './push';

const AuthContext = createContext(null);

// متاجر يستطيع إدارة مخزونها: المالك، أو عضو له صلاحية المنتجات
export const canManageStock = (s) => s.role === 'owner' || (s.permissions || []).includes('product.crud') || (s.permissions || []).includes('*');

/** صلاحية في المتجر كما في الفريق: المالك وصاحب «*» لهما كل شيء */
/** صاحب المتجر الحالي فقط — الربحية وإعلانات ميتا */
export const isStoreOwner = (s) => s?.role === 'owner';

export const hasPerm = (s, perm) => !!s && (s.role === 'owner' || (s.permissions || []).includes('*') || (s.permissions || []).includes(perm));

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [stores, setStores] = useState([]);
  const [storeId, setStoreIdState] = useState(getStoreId());
  const [loading, setLoading] = useState(!!getToken());
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    if (!getToken()) { setStores([]); setLoading(false); return; }
    setLoading(true);
    setOffline(false);
    try {
      const { data } = await api.get('/stores/user/me');
      const list = (data?.stores || data?.data || data || []).filter?.((s) => s.selectable !== false) ?? [];
      setStores(list);
      const keep = list.find((s) => s.id === getStoreId());
      const next = keep?.id || list[0]?.id || null;
      setStoreId(next);
      setStoreIdState(next);
    } catch (err) {
      setStores([]);
      // الخادم ردّ بخطأ (حساب محذوف، 401، 500…) → خروج إلى الدخول؛ بلا اتصال → شاشة «إعادة المحاولة» بدل «أنشئ متجرك الأول»
      if (err?.response) { setToken(null); setTokenState(null); } else setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [token, refresh]);
  // حساب جديد على هذا الهاتف: الإشعارات تتبعه (لا تبقى للحساب السابق)
  useEffect(() => { if (token) syncPush(); }, [token]);

  const login = (newToken, preferredStoreId) => {
    if (preferredStoreId) setStoreId(preferredStoreId);
    setToken(newToken);
    setTokenState(newToken);
  };
  const logout = async () => {
    await releasePush(); // قبل مسح الجلسة: الطلب يحتاجها
    setToken(null); setTokenState(null); setStores([]);
  };
  const selectStore = (id) => { setStoreId(id); setStoreIdState(id); };

  return (
    <AuthContext.Provider value={{ token, stores, offline, storeId, store: stores.find((s) => s.id === storeId) || null, can: (perm) => hasPerm(stores.find((s) => s.id === storeId), perm), isOwner: isStoreOwner(stores.find((s) => s.id === storeId)), loading, login, logout, selectStore, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
