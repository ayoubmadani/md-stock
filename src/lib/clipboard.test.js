import { describe, expect, it } from 'vitest';
import { clipboardImages, pastedImages } from './clipboard';

const item = (types, blobs) => ({ types, getType: async (t) => blobs[t] });

describe('لصق صورة من الحافظة', () => {
  it('زر «لصق»: يحوّل صور الحافظة إلى ملفات ويتجاهل النص', async () => {
    const png = new Blob(['x'], { type: 'image/png' });
    const clipboard = { read: async () => [item(['text/plain'], {}), item(['image/png'], { 'image/png': png })] };
    const files = await clipboardImages(clipboard);
    expect(files).toHaveLength(1);
    expect(files[0]).toBeInstanceOf(File);
    expect(files[0].type).toBe('image/png');
    expect(files[0].name).toMatch(/^paste-\d+\.png$/);
  });

  it('متصفح لا يدعم قراءة الحافظة ← خطأ unsupported', async () => {
    await expect(clipboardImages({})).rejects.toThrow('unsupported');
  });

  it('Ctrl+V: الصور من حدث اللصق فقط', () => {
    const f = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    const data = { items: [{ kind: 'string', type: 'text/plain' }, { kind: 'file', type: 'image/jpeg', getAsFile: () => f }] };
    expect(pastedImages(data)).toEqual([f]);
    expect(pastedImages(null)).toEqual([]);
  });
});
