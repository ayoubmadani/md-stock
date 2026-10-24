import { describe, expect, it } from 'vitest';
import { centerSquare } from './square.js';

describe('centerSquare', () => {
  it('a portrait photo is cut top and bottom', () => {
    expect(centerSquare(1080, 1920)).toEqual({ sx: 0, sy: 420, size: 1080 });
  });
  it('a landscape photo is cut left and right', () => {
    expect(centerSquare(1920, 1080)).toEqual({ sx: 420, sy: 0, size: 1080 });
  });
  it('a square photo stays as it is', () => {
    expect(centerSquare(800, 800)).toEqual({ sx: 0, sy: 0, size: 800 });
  });
});
