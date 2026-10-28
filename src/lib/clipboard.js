// لصق صورة منسوخة (لقطة شاشة، صورة من واتساب أو موقع) في مكتبة الصور

const asFile = (blob, type) => new File([blob], `paste-${Date.now()}.${type.split('/')[1] || 'png'}`, { type });

/** زر «لصق»: الصور الموجودة في الحافظة كملفات — يرمي unsupported إن لم يدعم المتصفح القراءة */
export async function clipboardImages(clipboard = navigator.clipboard) {
  if (!clipboard?.read) throw new Error('unsupported');
  const files = [];
  for (const item of await clipboard.read()) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (type) files.push(asFile(await item.getType(type), type));
  }
  return files;
}

/** Ctrl+V: الصور من حدث اللصق (clipboardData) */
export const pastedImages = (data) =>
  [...(data?.items ?? [])].filter((i) => i.kind === 'file' && i.type.startsWith('image/')).map((i) => i.getAsFile()).filter(Boolean);
