// تحويل أقسام صفحة الصور (<section class="s">) إلى صور في المتصفح.
// الـ HTML من Claude يُعرض في iframe معزول بلا سكربتات، ثم يُصوَّر كل قسم بعرض 720 × pixelRatio.
import { toCanvas } from 'html-to-image';
import { loadFontCss } from './fonts.js';

export const TRANSPARENT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const WIDTH = 720;

export function fillPlaceholders(html, images) {
  return html.replace(/\{\{(IMG|DETAIL)_(\d+)\}\}/g, (_, kind, n) => images[kind]?.[Number(n) - 1] || TRANSPARENT_PNG);
}

// نسخ المستند داخل iframe فارغ (بدل srcdoc): نفس الأصل، وsandbox يمنع أي سكربت داخله
function mount(html) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('sandbox', 'allow-same-origin');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px;height:1200px;border:0;opacity:0;pointer-events:none;`;
  document.body.appendChild(iframe);

  const src = new DOMParser().parseFromString(html, 'text/html');
  const doc = iframe.contentDocument;
  for (const { name, value } of src.documentElement.attributes) doc.documentElement.setAttribute(name, value);
  doc.head.innerHTML = src.head.innerHTML;
  doc.body.innerHTML = src.body.innerHTML;
  doc.querySelectorAll('script').forEach((s) => s.remove());
  return { iframe, doc };
}

const encode = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

// toBlob في html-to-image يتجاهل type/quality (يرجع PNG دائمًا) — نرسم ثم نرمّز بأنفسنا.
// الصورة الطويلة قد تتجاوز حد الرفع: نخفض الجودة تدريجيًا حتى تدخل تحت maxBytes.
const QUALITIES = [0.92, 0.85, 0.75, 0.7, 0.6, 0.5];

async function render(node, opts, maxBytes) {
  const canvas = await toCanvas(node, opts);
  const probe = await encode(canvas, 'image/webp', QUALITIES[0]);
  const type = probe?.type === 'image/webp' ? 'image/webp' : 'image/jpeg'; // Safari القديم يرجع PNG عند طلب WebP
  let blob = type === 'image/webp' ? probe : await encode(canvas, 'image/jpeg', 0.9);
  for (const q of QUALITIES.slice(1)) {
    if (!blob || blob.size <= maxBytes) break;
    blob = await encode(canvas, type, q);
  }
  return blob;
}

// onProgress(index, blob): يُستدعى فور تصوير كل قسم — لعرض الصور واحدة بواحدة
export async function captureSections(html, { pixelRatio = 1.5, maxHeight = 1100, maxBytes = 3.8 * 1024 * 1024, onProgress } = {}) {
  const fontCss = await loadFontCss();
  const { iframe, doc } = mount(html);
  try {
    const style = doc.createElement('style');
    style.textContent = `${fontCss}\nhtml,body{margin:0;padding:0;width:${WIDTH}px;}\n.s{overflow:hidden;}`;
    doc.head.prepend(style);

    if (doc.fonts) {
      await doc.fonts.ready;
      await Promise.all([doc.fonts.load('48px Lalezar'), doc.fonts.load('26px Tajawal'), doc.fonts.load('800 26px Tajawal')]);
    }
    await Promise.all([...doc.images].map((img) => img.decode?.().catch(() => {})));

    const sections = [...doc.querySelectorAll('section.s')];
    const out = [];
    for (const section of sections) {
      const height = Math.min(section.scrollHeight || section.offsetHeight || maxHeight, maxHeight);
      const blob = await render(section, { width: WIDTH, height, pixelRatio, fontEmbedCSS: fontCss, style: { margin: '0' } }, maxBytes);
      if (!blob) throw new Error('capture_failed');
      out.push(blob);
      onProgress?.(out.length - 1, blob);
    }
    return out;
  } finally {
    iframe.remove();
  }
}
