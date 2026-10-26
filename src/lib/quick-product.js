// منتج سريع (من المحل): صورة + اسم + سعر + كمية + باركود، والمقاسات/الألوان فقط إن وُجدت — نفس جسم نموذج المنتج
import { newAttribute, newValue, productPayload } from './product-form';

export function quickAttributes({ sizes = [], colors = [] }, names) {
  const out = [];
  if (sizes.length) out.push({ ...newAttribute('text', names.size), type: 'size', variants: sizes.map(newValue) });
  // الألوان تُكتب كلمات («أحمر») لا رموز hex ← خاصية نصية (لا دوائر ألوان فارغة في المتجر)
  if (colors.length) out.push({ ...newAttribute('text', names.color), variants: colors.map(newValue) });
  return out;
}

export const quickErrors = (f) => [
  ...(!String(f.name || '').trim() ? ['name'] : []),
  ...(!(Number(f.price) > 0) ? ['price'] : []),
];

export function quickProductBody(f, names) {
  const attributes = quickAttributes(f, names);
  return productPayload(
    { name: f.name, price: f.price, priceOriginal: '', desc: '', barcode: f.barcode, stock: f.stock, isActive: true },
    { attributes, offers: [], images: f.image ? [f.image] : [] },
  );
}
