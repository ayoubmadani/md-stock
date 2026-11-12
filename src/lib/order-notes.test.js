import { describe, expect, it } from 'vitest';
import { asksReason, noteBody, REASONS } from './order-notes';

describe('order notes', () => {
  it('a reason is offered (optional) when the order is cancelled, returned, postponed or a call failed', () => {
    expect(['cancelled', 'returned', 'postponed', 'appl1', 'appl2', 'appl3'].every(asksReason)).toBe(true);
    expect(['confirmed', 'shipping', 'delivered', 'pending'].some(asksReason)).toBe(false);
  });
  it('same reasons as the server', () => {
    expect(REASONS).toEqual(['phone_off', 'no_answer', 'changed_mind', 'price', 'wrong_number', 'delay', 'duplicate', 'other']);
  });
  it('the body sent with a status change; nothing when skipped', () => {
    expect(noteBody({ from: 'confirmed', to: 'cancelled', reason: 'price', text: ' cher ' })).toEqual({ fromStatus: 'confirmed', toStatus: 'cancelled', reason: 'price', text: 'cher' });
    expect(noteBody({ from: 'confirmed', to: 'cancelled', reason: null, text: '  ' })).toBeNull();
    expect(noteBody({ reason: null, text: 'note libre' })).toEqual({ text: 'note libre' });
  });
});
