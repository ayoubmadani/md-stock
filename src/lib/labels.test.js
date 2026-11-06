import { describe, expect, it } from 'vitest';
import { labelLinks } from './labels';

describe('labelLinks', () => {
  it('url files stay links; pdf files become a blob link', () => {
    expect(labelLinks([{ type: 'pdf', data: 'QUJD' }, { type: 'url', data: 'https://zr/l.html' }, null], (b) => `blob:${b}`))
      .toEqual(['blob:QUJD', 'https://zr/l.html']);
  });
});
