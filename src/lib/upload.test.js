import { describe, expect, it } from 'vitest';
import { COMPRESS, STORE_IMAGE_FOLDER } from './upload';

describe('مجلدات صور المتجر (نفس مجلدات لوحة التاجر)', () => {
  it('each kind has its own folder so the library does not mix them', () => {
    expect(STORE_IMAGE_FOLDER).toEqual({ logo: 'logo', favicon: 'favicon', cover: 'hero', cover_mobile: 'hero' });
  });
  it('logo, favicon and cover uploads are not re-compressed to JPEG (keeps transparency)', () => {
    for (const f of ['logo', 'favicon', 'hero']) expect(COMPRESS[f]).toBeNull();
  });
});
