import { describe, expect, it } from 'vitest';
import { imageSlotClass, MAIN_IMAGE_CLASS } from './image-slots.js';

// شبكة صور المنتج في التطبيق (3 أعمدة، 5 من sm): زر الإضافة ثم الرئيسية 2×2 في العمودين 2-3،
// وفي السطرين الأولين تمتلئ الخانات عموداً عموداً (تحت زر الإضافة، ثم أعلى/أسفل العمود 4، ثم 5).
// ما بعدها يتبع ترتيب الشبكة من السطر الثالث — نفس ترتيب لوحة التحكم.
describe('image grid slots (app)', () => {
  it('main image in columns 2-3 over the first two rows', () => {
    expect(MAIN_IMAGE_CLASS).toBe('col-start-2 row-start-1 col-span-2 row-span-2');
  });

  it('add button corner, then under it, then columns 4 and 5 top/bottom', () => {
    expect([0, 1, 2, 3, 4, 5].map(imageSlotClass)).toEqual([
      'col-start-1 row-start-1',
      'col-start-1 row-start-2',
      'sm:col-start-4 sm:row-start-1',
      'sm:col-start-4 sm:row-start-2',
      'sm:col-start-5 sm:row-start-1',
      'sm:col-start-5 sm:row-start-2',
    ]);
  });

  it('later slots have no fixed place (flow from row 3)', () => {
    expect(imageSlotClass(6)).toBe('');
    expect(imageSlotClass(-1)).toBe('');
  });
});
