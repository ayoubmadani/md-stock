// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { buildImagePageTree, chunkBySize, countSections } from './generator';

describe('buildImagePageTree', () => {
  const form = { buttonText: 'اطلب', buttonBackgroundColor: '#ff0000', title: 'x', borderRadius: 12 };

  it('images in order, form after formAfter, colors and product applied', () => {
    const tree = buildImagePageTree(['u1', 'u2', 'u3'], { form, formAfter: 1, productId: 'p1' });
    expect(tree.map((b) => b.type)).toEqual(['image', 'image', 'productForm', 'image']);
    expect(tree[0].props).toMatchObject({ src: 'u1', width: 100, align: 'center' });
    expect(tree[2].props).toMatchObject({ buttonText: 'اطلب', buttonBackgroundColor: '#ff0000', productId: 'p1', inputBorderColor: '#e4e4e7', borderRadius: 12 });
    expect(new Set(tree.map((b) => b.id)).size).toBe(4);
  });

  it('out-of-range formAfter → form at the end', () => {
    const tree = buildImagePageTree(['u1', 'u2'], { form, formAfter: 9 });
    expect(tree.map((b) => b.type)).toEqual(['image', 'image', 'productForm']);
    expect(tree[2].props.productId).toBe('');
  });
});

describe('chunkBySize', () => {
  const b = (n) => ({ size: n });
  it('groups consecutive blobs under the limit, keeping order and start index', () => {
    expect(chunkBySize([b(2), b(2), b(1), b(3)], 4)).toEqual([
      { start: 0, items: [b(2), b(2)] },
      { start: 2, items: [b(1), b(3)] },
    ]);
  });
  it('a single oversized blob still gets its own chunk', () => {
    expect(chunkBySize([b(9), b(1)], 4)).toEqual([{ start: 0, items: [b(9)] }, { start: 1, items: [b(1)] }]);
  });
});

describe('countSections', () => {
  it('counts section.s like the server validator', () => {
    expect(countSections('<section class="s">a</section><section class="hero s" id="x">b</section><section class="x">c</section>')).toBe(2);
  });
});

describe('generateImagePage (full run, every outside step mocked)', () => {
  it('cutout → palette → design → capture → upload → tree, reporting each step', async () => {
    const { generateImagePage } = await import('./generator');
    const steps = [];
    const calls = [];
    const deps = {
      downscale: async (f) => f,
      removeBackground: async (b) => b,
      extractPalette: async () => ['#ff0000'],
      extractBackgroundPalette: async () => [],
      blobToDataUrl: async () => 'data:x',
      fillPlaceholders: (html) => html,
      captureSections: async (_html, { onProgress }) => { const out = [new Blob(['a'], { type: 'image/webp' }), new Blob(['b'], { type: 'image/webp' })]; out.forEach((b, i) => onProgress(i, b)); return out; },
      post: async (url, body) => {
        calls.push(url);
        if (url.endsWith('/generate-image-page')) return { data: { generationId: 'g1', html: '<section class="s"></section><section class="s"></section>', form: { buttonText: 'x' }, formAfter: 0 } };
        return { data: { urls: body.getAll('files').map((_, i) => `u${i}`) } };
      },
    };
    const tree = await generateImagePage({ pageId: 'p', files: [{ size: 1 }], productId: 'prod', language: 'ar', onStep: (s) => steps.push(s) }, deps);
    expect(steps).toEqual(['cutout', 'palette', 'design', 'capture', 'upload']);
    expect(calls).toEqual(['/builder-pages/p/generate-image-page', '/builder-pages/p/image-page-sections']);
    expect(tree.map((b) => b.type)).toEqual(['image', 'productForm', 'image']);
    expect(tree[1].props.productId).toBe('prod');
  });
});

// نفس قواعد اللوحة (dashboard-order/src/pages/editor/imagePage/useImagePageGenerator.test.js)
describe('buildImagePageTree — AI layout plan (extras), same as the dashboard', () => {
  const form = { buttonText: 'اطلب', borderRadius: 14 };
  const extras = {
    topBar: { enabled: true, text: 'توصيل مجاني • الدفع عند الاستلام', backgroundColor: '#B91C1C', textColor: '#ffffff', direction: 'rtl' },
    overlays: [
      { section: 0, kind: 'button', text: 'احصل عليه', x: 50, y: 88, width: 60, backgroundColor: '#F59E0B', textColor: '#111111', linkType: 'form' },
      { section: 1, kind: 'marquee', text: 'عرض محدود', x: 50, y: 10, width: 100, backgroundColor: '#000000', textColor: '#ffffff', linkType: 'form' },
      { section: 0, kind: 'button', text: 'واتساب', x: 50, y: 70, width: 50, backgroundColor: '#25D366', textColor: '#ffffff', linkType: 'whatsapp' },
    ],
    whatsappButton: true,
  };

  it('top bar spacer first with a scrolling text; overlays on their images; floating WhatsApp', () => {
    const tree = buildImagePageTree(['u1', 'u2'], { form, formAfter: 1, extras, whatsapp: '0555123456', rand: () => 0 });
    expect(tree.map((b) => b.type)).toEqual(['spacer', 'image', 'image', 'productForm', 'floatingButton']);
    expect(tree[0].props.elements[0]).toMatchObject({ type: 'text', marquee: 'rtl', width: 100, content: 'توصيل مجاني • الدفع عند الاستلام' });
    expect(tree[1].props.elements[0]).toMatchObject({ type: 'button', linkType: 'form', text: 'احصل عليه', borderRadius: 14, animation: 'pulse' });
    expect(tree[1].props.elements[1]).toMatchObject({ type: 'button', linkType: 'whatsapp', whatsappNumber: '0555123456' });
    expect(tree[2].props.elements[0]).toMatchObject({ type: 'text', marquee: 'rtl', content: 'عرض محدود' });
    expect(tree[4].props).toMatchObject({ linkType: 'whatsapp', whatsappNumber: '0555123456', icon: 'WhatsApp' });
  });

  it('no WhatsApp number → no WhatsApp buttons at all', () => {
    const tree = buildImagePageTree(['u1'], { form, formAfter: 0, extras, whatsapp: '' });
    expect(tree.some((b) => b.type === 'floatingButton')).toBe(false);
    expect(tree.find((b) => b.type === 'image').props.elements.some((e) => e.linkType === 'whatsapp')).toBe(false);
  });

  it('no plan → same page as before', () => {
    expect(buildImagePageTree(['u1', 'u2'], { form, formAfter: 1 }).map((b) => b.type)).toEqual(['image', 'image', 'productForm']);
  });
});

describe('generateImagePage sends hasWhatsapp and uses the store number', () => {
  it('asks the store number, tells the AI, and builds the WhatsApp button', async () => {
    const { generateImagePage } = await import('./generator');
    let body;
    const deps = {
      downscale: async (f) => f, removeBackground: async (b) => b, extractPalette: async () => ['#ff0000'], extractBackgroundPalette: async () => [],
      blobToDataUrl: async () => 'data:x', fillPlaceholders: (h) => h,
      captureSections: async () => [new Blob(['a'], { type: 'image/webp' })],
      storeWhatsapp: async (id) => (id === 's1' ? '0555123456' : ''),
      post: async (url, b) => {
        if (url.endsWith('/generate-image-page')) { body = b; return { data: { generationId: 'g', html: '<section class="s"></section>', form: {}, formAfter: 0, extras: { topBar: null, overlays: [], whatsappButton: true } } }; }
        return { data: { urls: ['u0'] } };
      },
    };
    const tree = await generateImagePage({ pageId: 'p', storeId: 's1', files: [{ size: 1 }], language: 'ar' }, deps);
    expect(body.hasWhatsapp).toBe(true);
    expect(tree.at(-1)).toMatchObject({ type: 'floatingButton', props: { whatsappNumber: '0555123456' } });
  });
});
