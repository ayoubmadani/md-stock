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

// نفس defaultProps في componentsMap اللوحة
const SPACER_DEFAULTS = { height: 60, backgroundColor: '#ffffff', locked: false, position: 'static' };
const FLOATING_DEFAULTS = {
  link: '', linkType: 'external', position: 'bottom-right', contentType: 'icon', text: 'تواصل معنا', icon: 'MessageCircle',
  width: 56, height: 56, backgroundColor: '#10b981', textColor: '#ffffff', fontSize: 14, animation: 'none', borderRadius: 999,
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

// خطة الذكاء الاصطناعي (extras، منظَّفة في الخادم) ← بلوكات وعناصر حقيقية فوق الصور — نفس اللوحة:
//   topBar ← بلوك «مساحة فارغة» أول الصفحة فيه نص متحرك بعرضه
//   overlays ← عناصر عائمة فوق صورة قسمها (زر نموذج/واتساب أو شريط نص متحرك)
//   whatsappButton ← زر واتساب عائم — فقط إن كان للمتجر رقم (whatsapp)، وكذلك أزرار واتساب فوق الصور
const LIVELY = ['pulse', 'bounce', 'glow', 'heartbeat', 'shake'];

function overlayElement(o, whatsapp, look) {
  if (o.kind === 'marquee') {
    return { id: uuid(), type: 'text', content: o.text, x: 50, y: o.y, width: 100, height: 56, fontSize: 22, fontWeight: 700, color: o.textColor, backgroundColor: o.backgroundColor, marquee: 'rtl', marqueeSpeed: 12, marqueeRepeat: 2 };
  }
  return {
    id: uuid(), type: 'button', text: o.text, linkType: o.linkType, ...(o.linkType === 'whatsapp' ? { whatsappNumber: whatsapp } : { link: '#' }),
    x: o.x, y: o.y, width: o.width, height: 60, fontSize: 20, borderRadius: look.radius, backgroundColor: o.backgroundColor, textColor: o.textColor, animation: look.animation,
  };
}

export function buildImagePageTree(urls, { form, formAfter, productId, extras, whatsapp = '', rand = Math.random }) {
  const look = {
    radius: Number.isFinite(Number(form?.borderRadius)) ? Number(form.borderRadius) : 12,
    animation: LIVELY[Math.min(LIVELY.length - 1, Math.floor(rand() * LIVELY.length))],
  };
  const overlays = (extras?.overlays || []).filter((o) => o.linkType !== 'whatsapp' || o.kind !== 'button' || whatsapp);
  const images = urls.map((src, i) => ({
    id: uuid(), type: 'image',
    props: { ...IMAGE_DEFAULTS, src, width: 100, elements: overlays.filter((o) => o.section === i).map((o) => overlayElement(o, whatsapp, look)) },
  }));
  const formBlock = { id: uuid(), type: 'productForm', props: { ...FORM_DEFAULTS, ...form, productId: productId || '' } };
  const at = Math.min(Math.max(0, formAfter ?? images.length - 1), images.length - 1) + 1;
  const tree = [...images.slice(0, at), formBlock, ...images.slice(at)];

  const bar = extras?.topBar;
  if (bar?.text) {
    tree.unshift({
      id: uuid(), type: 'spacer',
      props: {
        ...SPACER_DEFAULTS, height: 48, backgroundColor: bar.backgroundColor,
        elements: [{ id: uuid(), type: 'text', content: bar.text, x: 50, y: 50, width: 100, fontSize: 18, fontWeight: 700, color: bar.textColor, marquee: bar.direction === 'ltr' ? 'ltr' : 'rtl', marqueeSpeed: 12, marqueeRepeat: 1 }],
      },
    });
  }
  if (extras?.whatsappButton && whatsapp) {
    tree.push({
      id: uuid(), type: 'floatingButton',
      props: { ...FLOATING_DEFAULTS, linkType: 'whatsapp', whatsappNumber: whatsapp, icon: 'WhatsApp', backgroundColor: '#25D366', textColor: '#ffffff', position: 'bottom-right', animation: 'pulse' },
    });
  }
  return tree;
}

const DEFAULT_DEPS = {
  downscale, extractPalette, extractBackgroundPalette, blobToDataUrl, fillPlaceholders, captureSections,
  removeBackground: removeBackgroundCached,
  post: (url, body) => api.post(url, body, { timeout: 180000 }),
  // رقم واتساب المتجر — لأزرار واتساب التي يقترحها الذكاء الاصطناعي
  storeWhatsapp: (storeId) => (storeId
    ? api.get(`/stores/${storeId}`).then((r) => String(r.data?.data?.contact?.whatsapp || r.data?.contact?.whatsapp || '').trim()).catch(() => '')
    : Promise.resolve('')),
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
export async function generateImagePage({ pageId, storeId, files, productId, description, price, language, primaryColor, onStep, onPreview }, deps = DEFAULT_DEPS) {
  onStep?.('cutout');
  const photos = await Promise.all(files.slice(0, 3).map((f) => deps.downscale(f)));
  const cutouts = [];
  for (const p of photos) cutouts.push(await deps.removeBackground(p, pageId)); // واحدة تلو الأخرى

  onStep?.('palette');
  const palette = await deps.extractPalette(cutouts[0], 5);
  const backgroundPalette = await deps.extractBackgroundPalette(photos[0], cutouts[0], 4).catch(() => []);

  onStep?.('design');
  const whatsapp = deps.storeWhatsapp ? await deps.storeWhatsapp(storeId) : '';
  const res = await deps.post(`/builder-pages/${pageId}/generate-image-page`, {
    productId: productId || undefined, description: description || undefined, price, language, style: 'auto',
    palette: palette.length ? palette : ['#1f2937'], backgroundPalette, primaryColor,
    cutouts: cutouts.length, details: photos.length, hasWhatsapp: !!whatsapp,
  });
  const design = {
    ...res.data, productId, whatsapp,
    images: { IMG: await Promise.all(cutouts.map(deps.blobToDataUrl)), DETAIL: await Promise.all(photos.map(deps.blobToDataUrl)) },
  };
  try {
    return await captureAndUpload(pageId, design, { onStep, onPreview }, deps);
  } catch (err) {
    err.design = design;
    throw err;
  }
}

// صورة منتج برقمها (نفس ترتيب صور المنتج) عبر الخادم — R2 لا يسمح للمتصفح بقراءة بكسلاتها مباشرة
export const fetchProductPhoto = (pageId, productId, n) =>
  api.get(`/builder-pages/${pageId}/image-page-product-photo`, { params: { productId, n }, responseType: 'blob' }).then((r) => r.data);

// صورة من تخزيننا (مكتبة الصور / منتج آخر) برابطها، عبر الخادم
export const fetchStoredPhoto = (pageId, url) =>
  api.get(`/builder-pages/${pageId}/image-page-photo`, { params: { url }, responseType: 'blob' }).then((r) => r.data);

// صور المنتج عبر الخادم — حتى 3، والمفقودة تُتجاهل
export const fetchProductPhotos = (pageId, productId, max = 3) => Promise.all(
  Array.from({ length: max }, (_, n) => api.get(`/builder-pages/${pageId}/image-page-product-photo`, { params: { productId, n }, responseType: 'blob' })
    .then((r) => r.data).catch(() => null)),
).then((list) => list.filter(Boolean));
