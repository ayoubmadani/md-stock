// سطر من متجر مربوط (WooCommerce…) بلا منتج MD Store: يُعرض كما جاء (الاسم، الصورة، الخيارات) ولا يُعدَّل هنا.
// سطر مربوط بمنتج MD Store (مستورد منه) سطر عادي يُعدَّل.
export const isExternalLine = (it) => it?.external != null && !it?.productId;

const isUrl = (v) => /^https?:\/\//i.test(String(v || ''));
const isHex = (v) => /^#[0-9a-f]{3,8}$/i.test(String(v || ''));

/** خيارات السطر الخارجي كأجزاء VariantParts: دائرة لون، صورة، أو نص — مع اسم الخيار */
export function externalParts(ext) {
  const variant = Array.isArray(ext?.variant) ? ext.variant : [];
  if (variant.length) {
    return variant.map((v) => {
      const name = String(v?.value ?? '');
      if (v?.displayMode === 'color' && isHex(v?.color)) return { displayMode: 'color', value: v.color, attrName: v.attrName || '', label: name };
      if (v?.displayMode === 'image' && isUrl(v?.image)) return { displayMode: 'image', value: v.image, attrName: v.attrName || '', label: name };
      return { displayMode: 'text', value: name, attrName: v?.attrName || '', label: '' };
    });
  }
  const text = String(ext?.options ?? '').trim();
  return text ? [{ displayMode: 'text', value: text, attrName: '', label: '' }] : [];
}
