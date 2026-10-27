// زبائن المتجر (البيع في المحل): الاسم والهاتف إجباريان، هاتف ثانٍ وصورة الزبون اختياريان

export const EMPTY_CUSTOMER = { name: '', phone: '', phone2: '', photoUrl: '' };

const orNull = (v) => String(v ?? '').trim() || null;

export const customerBody = (f) => ({
  name: f.name.trim(), phone: f.phone.trim(), phone2: orNull(f.phone2), photoUrl: orNull(f.photoUrl),
});

export const customerToForm = (c) => ({
  name: c.name || '', phone: c.phone || '', phone2: c.phone2 || '', photoUrl: c.photoUrl || '',
});

export const customerReady = (f) => !!(f.name.trim() && f.phone.trim());
