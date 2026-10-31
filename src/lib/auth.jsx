import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getStoreId, getToken, setStoreId, setToken } from './api';
import { releasePush, syncPush } from './push';
import { nextAccount, readAccounts, removeAccount, setAccountStore, tokenUserId, upsertAccount, writeAccounts } from './accounts';

const AuthContext = createContext(null);

// متاجر يستطيع إدارة مخزونها: المالك، أو عضو له صلاحية المنتجات
export const canManageStock = (s) => s.role === 'owner' || (s.permissions || []).includes('product.crud') || (s.permissions || []).includes('*');

/** صلاحية في المتجر كما في الفريق: المالك وصاحب «*» لهما كل شيء */
/** صاحب المتجر الحالي فقط — الربحية وإعلانات ميتا */
export const isStoreOwner = (s) => s?.role === 'owner';

/** عنصر قائمة (المزيد والشريط الجانبي): storeOwner = صاحب المتجر الحالي، owner = من يملك أي متجر، perm = صلاحية أو قائمة */
export const navVisible = (item, { can, isOwner, ownsAnyStore }) => {
  if (item.all) return true;
  if (item.storeOwner) return !!isOwner;
  if (item.owner) return !!ownsAnyStore;
  return !item.perm || [].concat(item.perm).some((p) => can(p));
};

export const hasPerm = (s, perm) => !!s && (s.role === 'owner' || (s.permissions || []).includes('*') || (s.permissions || []).includes(perm));

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  const [stores, setStores] = useState([]);
  const [storeId, setStoreIdState] = useState(getStoreId());
  const [loading, setLoading] = useState(!!getToken());
  const [offline, setOffline] = useState(false);
  // الحسابات المحفوظة على هذا الهاتف (lib/accounts.js)
  const [accounts, setAccounts] = useState(readAccounts);
  const saveAccounts = useCallback((fn) => { const next = fn(readAccounts()); writeAccounts(next); setAccounts(next); }, []);

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
      // الحساب الحالي يُحفظ في القائمة (اسم، بريد، صورة، آخر متجر) — للتبديل بلا كلمة سر
      const token = getToken(), id = tokenUserId(token);
      if (id) {
        api.get('/user/current-user')
          .then(({ data: u }) => { if (getToken() === token) saveAccounts((l) => upsertAccount(l, { id, token, email: u?.email || '', name: u?.username || '', image: u?.image || null, storeId: next })); })
          .catch(() => {});
      }
    } catch (err) {
      setStores([]);
      // الخادم ردّ بخطأ (حساب محذوف، 401، 500…) → خروج إلى الدخول؛ بلا اتصال → شاشة «إعادة المحاولة» بدل «أنشئ متجرك الأول»
      if (err?.response) { setToken(null); setTokenState(null); } else setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [saveAccounts]);

  useEffect(() => { refresh(); }, [token, refresh]);
  // حساب جديد على هذا الهاتف: الإشعارات تتبعه (لا تبقى للحساب السابق)
  useEffect(() => { if (token) syncPush(); }, [token]);

  const login = (newToken, preferredStoreId) => {
    if (preferredStoreId) setStoreId(preferredStoreId);
    setToken(newToken);
    setTokenState(newToken);
  };
  // خروج من الحساب الحالي فقط: ننتقل إلى الحساب التالي المحفوظ إن وُجد
  const logout = async () => {
    await releasePush(); // قبل مسح الجلسة: الطلب يحتاجها
    const id = tokenUserId(getToken());
    const left = removeAccount(readAccounts(), id);
    saveAccounts(() => left);
    const next = nextAccount(left, id);
    if (next) { applyAccount(next); window.location.assign('/'); return; }
    setToken(null); setTokenState(null); setStores([]);
  };
  const applyAccount = (a) => { setStoreId(a.storeId); setToken(a.token); setTokenState(a.token); setStoreIdState(a.storeId); };
  // تبديل الحساب بلا كلمة سر؛ إعادة تحميل كاملة حتى لا تبقى بيانات الحساب السابق في الصفحات
  const switchAccount = (id) => {
    const a = readAccounts().find((x) => x.id === id);
    if (!a || a.expired) return;
    applyAccount(a);
    window.location.assign('/');
  };
  const forgetAccount = (id) => saveAccounts((l) => removeAccount(l, id));
  const selectStore = (id) => {
    setStoreId(id); setStoreIdState(id);
    const me = tokenUserId(getToken());
    if (me) saveAccounts((l) => setAccountStore(l, me, id));
  };

  return (
    <AuthContext.Provider value={{ token, stores, offline, storeId, store: stores.find((s) => s.id === storeId) || null, can: (perm) => hasPerm(stores.find((s) => s.id === storeId), perm), isOwner: isStoreOwner(stores.find((s) => s.id === storeId)), loading, login, logout, selectStore, refresh, accounts, currentAccountId: tokenUserId(token), switchAccount, forgetAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
