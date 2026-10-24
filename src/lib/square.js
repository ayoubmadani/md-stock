// قص مربع 1:1 من وسط الصورة (صور المنتجات)

export function centerSquare(w, h) {
  const size = Math.min(w, h);
  return { sx: Math.round((w - size) / 2), sy: Math.round((h - size) / 2), size };
}

/** مصدر (فيديو/صورة) ← ملف JPEG مربع، أقصاه max بكسل */
export async function squareFile(source, w, h, { max = 1200, quality = 0.85, name = 'photo.jpg' } = {}) {
  const { sx, sy, size } = centerSquare(w, h);
  const out = Math.min(size, max);
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, out, out);
  ctx.drawImage(source, sx, sy, size, size, 0, 0, out, out);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  return new File([blob], name, { type: 'image/jpeg' });
}

/** ملف صورة (من كاميرا الهاتف) ← نفس الصورة مقصوصة مربعاً */
export async function squareFromFile(file, opts) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    return await squareFile(img, img.naturalWidth, img.naturalHeight, { name: file.name.replace(/\.\w+$/, '') + '.jpg', ...opts });
  } finally {
    URL.revokeObjectURL(url);
  }
}
