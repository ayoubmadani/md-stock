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
