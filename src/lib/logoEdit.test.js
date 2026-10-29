import { describe, expect, it } from 'vitest';
import { EDIT_RATIO, dragRect, fitRect } from './logoEdit';

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

describe('dragRect with a fixed ratio (favicon = square)', () => {
  const sq = { x: 10, y: 10, w: 40, h: 40 };
  it('a corner keeps the frame square', () => {
    const r = dragRect(sq, 'se', 20, 5, 100, 100, 1);
    expect(r.w).toBe(r.h);
    expect(r.w).toBe(60);
  });
  it('stays square when it hits the image edge', () => {
    const r = dragRect(sq, 'se', 200, 0, 100, 60, 1);
    expect(r).toEqual({ x: 10, y: 10, w: 50, h: 50 });
  });
  it('the top-left corner grows towards the top-left', () => {
    expect(dragRect(sq, 'nw', -5, -5, 100, 100, 1)).toEqual({ x: 5, y: 5, w: 45, h: 45 });
  });
  it('fitRect: the largest centred frame of that ratio', () => {
    expect(fitRect(200, 100, 1)).toEqual({ x: 50, y: 0, w: 100, h: 100 });
    expect(fitRect(200, 100)).toEqual({ x: 0, y: 0, w: 200, h: 100 });
  });
});

describe('cover ratios', () => {
  it('desktop cover is wide, phone cover is tall', () => {
    expect(EDIT_RATIO.cover).toBeGreaterThan(1);
    expect(EDIT_RATIO.cover_mobile).toBeLessThan(1);
    expect(EDIT_RATIO.favicon).toBe(1);
    expect(EDIT_RATIO.image).toBe(1); // صور المنتج مربعة دائماً
  });
});
