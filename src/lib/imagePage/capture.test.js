// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls = [];
// html-to-image يتجاهل type في toBlob — نرسم بـ toCanvas ونرمّز بأنفسنا
let encode = (type) => type;
let sizeFor = () => 1;
const fakeCanvas = () => ({ toBlob: (cb, type, quality) => { calls.push(`encode:${type}:${quality}`); const b = new Blob(['x'], { type: encode(type) }); Object.defineProperty(b, 'size', { value: sizeFor(type, quality) }); cb(b); } });
const toCanvas = vi.fn(async () => { calls.push('toBlob'); return fakeCanvas(); });
vi.mock('html-to-image', () => ({ toCanvas }));
vi.mock('./fonts.js', () => ({ loadFontCss: async () => "@font-face{font-family:'Lalezar';src:url(data:font/ttf;base64,AA==)}" }));

const { fillPlaceholders, captureSections, TRANSPARENT_PNG } = await import('./capture.js');

const page = (sections) => `<!doctype html><html dir="rtl" lang="ar"><head><style>.s{width:720px}</style></head><body>${sections}</body></html>`;

// jsdom: لا fonts ولا تخطيط — نضيفهما للـ iframe عند إلحاقه بالصفحة
let fonts, lastIframe;
beforeEach(() => {
  vi.restoreAllMocks();
  calls.length = 0;
  toCanvas.mockClear();
  encode = (type) => type;
  sizeFor = () => 1;
  fonts = { ready: Promise.resolve(), load: vi.fn(async () => { calls.push('fonts.load'); return []; }) };
  const orig = document.body.appendChild.bind(document.body);
  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
    const out = orig(node);
    if (node.tagName === 'IFRAME') {
      lastIframe = node;
      Object.defineProperty(node.contentDocument, 'fonts', { value: fonts, configurable: true });
      Object.defineProperty(node.contentWindow.HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get() { return parseInt(this.style.height) || 800; },
      });
    }
    return out;
  });
});

describe('fillPlaceholders', () => {
  it('replaces IMG and DETAIL', () => {
    const out = fillPlaceholders('<img src="{{IMG_1}}"><img src="{{DETAIL_2}}">', { IMG: ['data:a'], DETAIL: ['data:b', 'data:c'] });
    expect(out).toBe('<img src="data:a"><img src="data:c">');
  });

  it('unknown placeholder → transparent', () => {
    expect(fillPlaceholders('{{IMG_3}}', { IMG: ['data:a'], DETAIL: [] })).toBe(TRANSPARENT_PNG);
  });
});

describe('captureSections', () => {
  it('encodes webp 0.92 by default', async () => {
    const [blob] = await captureSections(page('<section class="s">a</section>'));
    expect(blob.type).toBe('image/webp');
    expect(calls).toContain('encode:image/webp:0.92');
  });

  it('captures every section.s in order', async () => {
    const blobs = await captureSections(page('<section class="s">1</section><div>x</div><section class="s hero">2</section>'));
    expect(blobs).toHaveLength(2);
    expect(toCanvas.mock.calls.map((c) => c[0].textContent)).toEqual(['1', '2']);
  });

  it('capture crops tall sections', async () => {
    await captureSections(page('<section class="s" style="height:1500px">t</section>'));
    const opts = toCanvas.mock.calls[0][1];
    expect(opts.height * opts.pixelRatio).toBeLessThanOrEqual(1100 * 1.5);
    expect(opts.width).toBe(720);
  });

  it('waits for fonts', async () => {
    await captureSections(page('<section class="s">a</section>'));
    expect(fonts.load).toHaveBeenCalledWith('48px Lalezar');
    expect(fonts.load).toHaveBeenCalledWith('26px Tajawal');
    expect(calls.indexOf('fonts.load')).toBeLessThan(calls.indexOf('toBlob'));
  });

  it('iframe has no allow-scripts and is removed', async () => {
    await captureSections(page('<section class="s">a</section>'));
    expect(lastIframe.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(document.body.contains(lastIframe)).toBe(false);
  });

  it('falls back to jpeg when webp is unsupported', async () => {
    encode = (type) => (type === 'image/webp' ? 'image/png' : type); // Safari القديم
    const [blob] = await captureSections(page('<section class="s">a</section>'));
    expect(blob.type).toBe('image/jpeg');
    expect(calls).toContain('encode:image/jpeg:0.9');
    expect(toCanvas).toHaveBeenCalledTimes(1); // بلا إعادة رسم
  });
  it('long page: custom maxHeight is respected', async () => {
    await captureSections(page('<section class="s" style="height:5000px">t</section>'), { maxHeight: 6000 });
    expect(toCanvas.mock.calls[0][1].height).toBe(5000);
  });

  it('lowers quality until the image fits under maxBytes', async () => {
    sizeFor = (_t, q) => (q > 0.75 ? 5_000_000 : 3_000_000);
    const [blob] = await captureSections(page('<section class="s">a</section>'), { maxBytes: 4_000_000 });
    expect(blob.size).toBe(3_000_000);
    expect(calls.some((c) => /encode:image\/webp:0\.7/.test(c))).toBe(true);
  });
  it('reports each section as soon as it is captured', async () => {
    const seen = [];
    await captureSections(page('<section class="s">1</section><section class="s">2</section>'), { onProgress: (i, blob) => seen.push([i, blob.type]) });
    expect(seen).toEqual([[0, 'image/webp'], [1, 'image/webp']]);
  });
});
