import { describe, expect, it } from 'vitest';
import { dragRect, removeWhite } from './logoEdit';

const px = (...rgba) => new Uint8ClampedArray(rgba);

describe('removeWhite', () => {
  it('white pixels become transparent, dark ones stay', () => {
    const d = removeWhite(px(255, 255, 255, 255, 20, 30, 40, 255), 240);
    expect(d[3]).toBe(0);
    expect(d[7]).toBe(255);
  });
  it('near-white pixels fade instead of a hard edge', () => {
    const a = removeWhite(px(230, 230, 230, 255), 240)[3];
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
  });
  it('a light colour (not grey-white) is kept', () => {
    expect(removeWhite(px(255, 255, 120, 255), 240)[3]).toBe(255);
  });
});

describe('dragRect', () => {
  const r = { x: 10, y: 10, w: 50, h: 40 };
  it('moves the whole frame and stays inside the image', () => {
    expect(dragRect(r, 'move', 5, 5, 100, 100)).toEqual({ x: 15, y: 15, w: 50, h: 40 });
    expect(dragRect(r, 'move', 500, -500, 100, 100)).toEqual({ x: 50, y: 0, w: 50, h: 40 });
  });
  it('corner handles resize from their side', () => {
    expect(dragRect(r, 'se', 10, 5, 100, 100)).toEqual({ x: 10, y: 10, w: 60, h: 45 });
    expect(dragRect(r, 'nw', -5, -5, 100, 100)).toEqual({ x: 5, y: 5, w: 55, h: 45 });
  });
  it('never smaller than the minimum or outside the image', () => {
    expect(dragRect(r, 'se', -100, -100, 100, 100)).toEqual({ x: 10, y: 10, w: 16, h: 16 });
    expect(dragRect(r, 'nw', -50, -50, 100, 100)).toEqual({ x: 0, y: 0, w: 60, h: 50 });
  });
});
