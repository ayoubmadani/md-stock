// ملصق باركود للطباعة (50×30 مم): اسم المنتج، الخيارات، الباركود، السعر
import JsBarcode from 'jsbarcode';
import { isValidEan13 } from './barcode';

export const barcodeFormat = (code) => (isValidEan13(code) ? 'EAN13' : 'CODE128');

export function labelLines({ name = '', variant = '', price = '' }) {
  return {
    name: String(name).trim(),
    variant: String(variant || '').trim(),
    price: price === '' || price == null ? '' : `${Number(price).toLocaleString('en-US')} DA`,
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** يطبع ملصقاً عبر iframe مخفي (يعمل داخل التطبيق المثبّت بلا نافذة جديدة) */
export function printLabel(code, info = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, code, { format: barcodeFormat(code), height: 40, width: 1.6, fontSize: 13, margin: 8, background: '#ffffff' });
  const l = labelLines(info);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>
    @page { size: 50mm 30mm; margin: 0; }
    html, body { margin: 0; background: #fff; color-scheme: light; }
    body { width: 50mm; height: 30mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6mm; font-family: system-ui, sans-serif; color: #000; overflow: hidden; }
    p { margin: 0; max-width: 47mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; }
    .n { font-size: 9pt; font-weight: 700; } .v { font-size: 7pt; } .p { font-size: 10pt; font-weight: 800; direction: ltr; }
    svg { max-width: 47mm; height: auto; }
  </style></head><body>
    ${l.name ? `<p class="n">${esc(l.name)}</p>` : ''}${l.variant ? `<p class="v">${esc(l.variant)}</p>` : ''}
    ${svg.outerHTML}
    ${l.price ? `<p class="p">${esc(l.price)}</p>` : ''}
  </body></html>`);
  doc.close();
  const win = frame.contentWindow;
  // على الهاتف print() لا ينتظر: لا نحذف الإطار قبل انتهاء نافذة الطباعة
  const done = () => frame.remove();
  win.onafterprint = done;
  setTimeout(done, 120000);
  setTimeout(() => { win.focus(); win.print(); }, 100);
}
