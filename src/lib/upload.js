// رفع الصور: تصغير في المتصفح ثم /images/upload (نفس مكتبة الصور في اللوحة)
import { api } from './api';

// نفس إعدادات الضغط في اللوحة: صور النسخ أصغر
// store: شعار/غلاف المتجر يُرفع كما هو (الشعار PNG بخلفية شفافة)
export const COMPRESS = { products: { max: 1920, quality: 0.8 }, productVariant: { max: 600, quality: 0.75 }, category: { max: 1920, quality: 0.8 }, store: null };
export const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

/** تصغير الصورة في المتصفح قبل الرفع (JPEG بخلفية بيضاء)؛ GIF يبقى كما هو */
export async function compress(file, { max, quality }) {
  if (file.type === 'image/gif') return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const ratio = Math.min(1, max / img.naturalWidth, max / img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** يرفع ملفاً واحداً ويرجع { url, … } */
export async function uploadImage(file, folder = 'products', onProgress) {
  const preset = folder in COMPRESS ? COMPRESS[folder] : COMPRESS.products;
  const body = new FormData();
  body.append('file', preset ? await compress(file, preset) : file);
  const { data } = await api.post(`/images/upload?folder=${folder}`, body, {
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
  return data;
}
