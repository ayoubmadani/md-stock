// نموذج المتجر: نفس جسم اللوحة (stores/create-full و PATCH stores/:id)

export const EMPTY_STORE = {
  name: '', logo: null, favicon: null, primaryColor: '#4f46e5', secondaryColor: '#f59e0b',
  phone: '', whatsapp: '', email: '', wilaya: '', address: '',
  language: 'ar', currency: 'DZD', country: 'DZ',
  cart: false, supportQty: true, supportFreeShipping: false, freeShippingMinAmount: '',
  showTopBar: true, topBarText: '', heroImage: null, heroTitle: '', heroSubtitle: '',
};

/** نطاق فرعي من الاسم + لاحقة عشوائية (الحقل لا يظهر للتاجر، كما في اللوحة) */
export function generateSubdomain(name, rnd = () => Math.random().toString(36).slice(2, 8)) {
  const base = String(name || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'store';
  return `${base}-${rnd()}`;
}

const s = (v) => String(v ?? '').trim();

export function storePayload(f, { subdomain }) {
  return {
    store: {
      name: s(f.name), subdomain, currency: f.currency, country: f.country, language: f.language,
      cart: !!f.cart, supportQty: !!f.supportQty, supportFreeShipping: !!f.supportFreeShipping,
      freeShippingMinAmount: f.supportFreeShipping && f.freeShippingMinAmount !== '' ? Number(f.freeShippingMinAmount) : null,
    },
    design: { primaryColor: f.primaryColor, secondaryColor: f.secondaryColor, logoUrl: f.logo || null, faviconUrl: f.favicon || null },
    topBar: { enabled: !!f.showTopBar, text: s(f.topBarText), color: f.primaryColor },
    contact: { email: s(f.email) || null, phone: s(f.phone) || null, whatsapp: s(f.whatsapp).replace(/[\s-]/g, '') || null, wilaya: f.wilaya || null, address: s(f.address) || null },
    hero: { imageUrl: f.heroImage || null, title: s(f.heroTitle), subtitle: s(f.heroSubtitle) },
  };
}

export const storeToForm = (st) => ({
  ...EMPTY_STORE,
  name: st.name || '', logo: st.design?.logoUrl || null, favicon: st.design?.faviconUrl || null,
  primaryColor: st.design?.primaryColor || EMPTY_STORE.primaryColor, secondaryColor: st.design?.secondaryColor || EMPTY_STORE.secondaryColor,
  phone: st.contact?.phone || '', whatsapp: st.contact?.whatsapp || '', email: st.contact?.email || '',
  wilaya: st.contact?.wilaya || '', address: st.contact?.address || '',
  language: st.language || 'ar', currency: st.currency || 'DZD', country: st.country || 'DZ',
  cart: !!st.cart, supportQty: st.supportQty ?? true, supportFreeShipping: !!st.supportFreeShipping,
  freeShippingMinAmount: st.freeShippingMinAmount == null ? '' : String(st.freeShippingMinAmount),
  showTopBar: st.topBar?.enabled ?? true, topBarText: st.topBar?.text || '',
  heroImage: st.hero?.imageUrl || null, heroTitle: st.hero?.title || '', heroSubtitle: st.hero?.subtitle || '',
});
