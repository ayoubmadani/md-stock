import { describe, expect, it } from 'vitest';
import { movePhoto } from './photos';

describe('movePhoto', () => {
  const l = ['a', 'b', 'c'];
  it('tapping a photo makes it the main one (first), keeping the others in order', () => expect(movePhoto(l, 2, 0)).toEqual(['c', 'a', 'b']));
  it('moves one step left / right', () => {
    expect(movePhoto(l, 0, 1)).toEqual(['b', 'a', 'c']);
    expect(movePhoto(l, 1, 0)).toEqual(['b', 'a', 'c']);
  });
  it('out of range or same place → unchanged copy', () => {
    expect(movePhoto(l, 0, -1)).toEqual(l);
    expect(movePhoto(l, 2, 3)).toEqual(l);
    expect(movePhoto(l, 1, 1)).toEqual(l);
  });
});
