// باركود EAN-13 يُولَّد للمتجر: يبدأ بـ 2 (نطاق مخصص للاستعمال الداخلي في المحل — لا يتعارض مع باركود مصنع)

/** رقم التحقق لـ 12 رقماً: أوزان 1 و 3 بالتناوب */
export function ean13CheckDigit(twelve) {
  const sum = [...twelve].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export const isValidEan13 = (code) => /^\d{13}$/.test(code) && ean13CheckDigit(code.slice(0, 12)) === Number(code[12]);

export function randomStoreEan13() {
  const body = '2' + Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
  return body + ean13CheckDigit(body);
}

/**
 * توليد جماعي: باركود لكل مفتاح بلا باركود (القائم يبقى)، بلا تكرار داخل الدفعة ولا مع القائم.
 * gen: دالة async تعطي باركوداً جديداً (freshBarcode يتحقق من المتجر). يُرجع { key: barcode } للجديد فقط.
 */
export async function fillMissingBarcodes(keys, current, gen = async () => randomStoreEan13()) {
  const used = new Set(Object.values(current).map((b) => String(b ?? '').trim()).filter(Boolean));
  const out = {};
  for (const k of keys) {
    if (String(current[k] ?? '').trim()) continue;
    let code;
    for (let i = 0; i < 10 && (!code || used.has(code)); i++) code = await gen();
    if (!code || used.has(code)) throw new Error('no free barcode');
    used.add(code);
    out[k] = code;
  }
  return out;
}
