// نموذج البكسل: نفس جسم اللوحة. رمز CAPI لا يُعاد من الخادم: يُرسل فقط إن كُتب جديد، أو "" لمسحه

export const DEFAULT_EVENTS = ['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase'];
export const EMPTY_PIXEL = { name: '', type: 'facebook', pixelId: '', accessToken: '', testEventCode: '', clearToken: false, isActive: true };

export function pixelError(f) {
  const id = String(f.pixelId ?? '').trim();
  if (!id) return 'pixels.id_required';
  if (f.type === 'facebook' && !/^\d+$/.test(id)) return 'pixels.id_digits';
  return null;
}

export function pixelPayload(f, editing = false) {
  const p = { name: f.name.trim(), type: f.type, pixelId: f.pixelId.trim(), isActive: f.isActive };
  if (!editing) Object.assign(p, { scope: 'store', events: DEFAULT_EVENTS });
  if (f.type === 'facebook') {
    if (f.accessToken.trim()) p.accessToken = f.accessToken.trim();
    else if (f.clearToken) p.accessToken = '';
    p.testEventCode = f.testEventCode.trim();
  }
  return p;
}
