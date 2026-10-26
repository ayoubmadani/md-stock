// خطوط صفحة الصور كـ data URLs: تُحقن في الـ iframe وتُضمَّن في كل صورة (html-to-image لا يرى خطوط الـ iframe وحده).
// الملفات في public/fonts من Google Fonts (رخصة OFL).
import { blobToDataUrl } from './prep.js';

const FACES = [
  { family: 'Lalezar', weight: 400, file: '/fonts/Lalezar-Regular.ttf' },
  { family: 'Tajawal', weight: 500, file: '/fonts/Tajawal-Medium.ttf' },
  { family: 'Tajawal', weight: 800, file: '/fonts/Tajawal-ExtraBold.ttf' },
];

let cached;

export function loadFontCss() {
  cached ??= Promise.all(
    FACES.map(async ({ family, weight, file }) => {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`font_load_failed:${file}`);
      const url = await blobToDataUrl(await res.blob());
      return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;font-display:block;src:url(${url}) format('truetype');}`;
    }),
  )
    .then((faces) => faces.join('\n'))
    .catch((e) => {
      cached = undefined; // محاولة جديدة في المرة القادمة
      throw e;
    });
  return cached;
}
