// صفحة الصور (الذكاء الاصطناعي الثاني) — نفس مسار اللوحة (useImagePageGenerator) بلا React:
// تجهيز الصور في المتصفح ← نزع الخلفية على الخادم ← الألوان ← تصميم Claude ← تصوير الأقسام ← رفعها ← شجرة الصفحة.
// recapture يعيد التصوير والرفع فقط بنفس التصميم (بلا طلب Claude جديد ولا احتساب).
import { api } from '../api';
import { downscale, removeBackgroundCached, extractPalette, extractBackgroundPalette, blobToDataUrl } from './prep';
import { fillPlaceholders, captureSections } from './capture';

const uuid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// نفس defaultProps في componentsMap اللوحة
const IMAGE_DEFAULTS = { src: '', alt: '', caption: '', width: 100, align: 'center', height: null };
const FORM_DEFAULTS = {
  productId: '', showProductName: true, productName: '', buttonText: 'اطلب الآن', containerBackgroundColor: '',
  backgroundColor: '#ffffff', textColor: '#27272a', buttonBackgroundColor: '#10b981', buttonTextColor: '#ffffff',
  buttonBorderColor: '', buttonBackgroundColorDisabled: '', buttonTextColorDisabled: '', buttonBorderColorDisabled: '',
  inputBackgroundColor: '#f9fafb', inputBorderColor: '#e4e4e7', inputTextColor: '#18181b',
  paddingX: 3, paddingY: 0, borderRadius: 0, sectionGap: 14, labelPosition: 'inside', fieldVariant: 'outlined',
};

// حد جسم الطلب في Vercel 4.5MB — نرفع الأقسام على دفعات أصغر من ذلك
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

export function chunkBySize(blobs, max = MAX_UPLOAD_BYTES) {
  const chunks = [];
  blobs.forEach((blob, i) => {
    const last = chunks[chunks.length - 1];
    const size = last ? last.items.reduce((n, x) => n + x.size, 0) : 0;
    if (last && size + blob.size <= max) last.items.push(blob);
    else chunks.push({ start: i, items: [blob] });
  });
  return chunks;
}

// نفس عدّ الخادم (validateImagePageHtml)
export function countSections(html) {
  return (html.match(/<section\b[^>]*class\s*=\s*["'][^"']*\bs\b[^"']*["']/gi) || []).length;
}

export function buildImagePageTree(urls, { form, formAfter, productId }) {
  const images = urls.map((src) => ({ id: uuid(), type: 'image', props: { ...IMAGE_DEFAULTS, src, width: 100 } }));
  const formBlock = { id: uuid(), type: 'productForm', props: { ...FORM_DEFAULTS, ...form, productId: productId || '' } };
  const at = Math.min(Math.max(0, formAfter ?? images.length - 1), images.length - 1) + 1;
  return [...images.slice(0, at), formBlock, ...images.slice(at)];
}

const DEFAULT_DEPS = {
  downscale, extractPalette, extractBackgroundPalette, blobToDataUrl, fillPlaceholders, captureSections,
  removeBackground: removeBackgroundCached,
  post: (url, body) => api.post(url, body, { timeout: 180000 }),
};

/** التصوير والرفع ← الشجرة. design = نتيجة Claude + الصور (تُحفظ لإعادة المحاولة بلا احتساب) */
export async function captureAndUpload(pageId, design, { onStep, onPreview } = {}, deps = DEFAULT_DEPS) {
  onStep?.('capture');
  const count = countSections(design.html);
  onPreview?.({ count, index: -1 });
  const blobs = await deps.captureSections(deps.fillPlaceholders(design.html, design.images), {
    onProgress: (index, blob) => onPreview?.({ count, index, blob }),
  });
  onStep?.('upload');
  const urls = [];
  for (const { start, items } of chunkBySize(blobs)) {
    const body = new FormData();
    body.append('generationId', design.generationId);
    body.append('startIndex', String(start));
    items.forEach((b, i) => body.append('files', b, `${start + i + 1}.${b.type === 'image/webp' ? 'webp' : 'jpg'}`));
    const res = await deps.post(`/builder-pages/${pageId}/image-page-sections`, body);
    urls.push(...res.data.urls);
  }
  return buildImagePageTree(urls, design);
}

/**
 * التشغيل الكامل. files: 1-3 صور (Blob). يرمي الخطأ مع err.design إن فشل بعد التصميم
 * (يمكن حينها captureAndUpload(pageId, err.design) بلا احتساب جديد).
 */
export async function generateImagePage({ pageId, files, productId, description, price, language, primaryColor, onStep, onPreview }, deps = DEFAULT_DEPS) {
  onStep?.('cutout');
  const photos = await Promise.all(files.slice(0, 3).map((f) => deps.downscale(f)));
  const cutouts = [];
  for (const p of photos) cutouts.push(await deps.removeBackground(p, pageId)); // واحدة تلو الأخرى

  onStep?.('palette');
  const palette = await deps.extractPalette(cutouts[0], 5);
  const backgroundPalette = await deps.extractBackgroundPalette(photos[0], cutouts[0], 4).catch(() => []);

  onStep?.('design');
  const res = await deps.post(`/builder-pages/${pageId}/generate-image-page`, {
    productId: productId || undefined, description: description || undefined, price, language, style: 'auto',
    palette: palette.length ? palette : ['#1f2937'], backgroundPalette, primaryColor,
    cutouts: cutouts.length, details: photos.length,
  });
  const design = {
    ...res.data, productId,
    images: { IMG: await Promise.all(cutouts.map(deps.blobToDataUrl)), DETAIL: await Promise.all(photos.map(deps.blobToDataUrl)) },
  };
  try {
    return await captureAndUpload(pageId, design, { onStep, onPreview }, deps);
  } catch (err) {
    err.design = design;
    throw err;
  }
}

// صور المنتج عبر الخادم (R2 لا يسمح للمتصفح بقراءتها مباشرة) — حتى 3، والمفقودة تُتجاهل
export const fetchProductPhotos = (pageId, productId, max = 3) => Promise.all(
  Array.from({ length: max }, (_, n) => api.get(`/builder-pages/${pageId}/image-page-product-photo`, { params: { productId, n }, responseType: 'blob' })
    .then((r) => r.data).catch(() => null)),
).then((list) => list.filter(Boolean));
