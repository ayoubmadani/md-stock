import { describe, it, expect } from 'vitest';
import { hasPassword, passwordBody, passwordFormError } from './profile';

describe('hasPassword', () => {
  it('Google-only account has no password yet', () => {
    expect(hasPassword('GOOGLE')).toBe(false);
    expect(hasPassword('CREDENTIALS')).toBe(true);
    expect(hasPassword('CREDENTIALS_GOOGLE')).toBe(true);
  });
});

describe('passwordFormError', () => {
  const ok = { current: 'old-pass', next: 'new-pass-1', confirm: 'new-pass-1' };
  it('valid form → null', () => {
    expect(passwordFormError(ok, true)).toBeNull();
  });
  it('current password required when the account already has one', () => {
    expect(passwordFormError({ ...ok, current: '' }, true)).toBe('current_required');
    expect(passwordFormError({ ...ok, current: '' }, false)).toBeNull();
  });
  it('new password at least 8 characters', () => {
    expect(passwordFormError({ ...ok, next: 'short', confirm: 'short' }, true)).toBe('too_short');
  });
  it('confirmation must match', () => {
    expect(passwordFormError({ ...ok, confirm: 'other-pass' }, true)).toBe('mismatch');
  });
});

describe('passwordBody', () => {
  it('sends the current password only when the account has one', () => {
    expect(passwordBody({ current: 'a', next: 'bbbbbbbb' }, true)).toEqual({ password: 'a', newPassword: 'bbbbbbbb' });
    expect(passwordBody({ current: '', next: 'bbbbbbbb' }, false)).toEqual({ newPassword: 'bbbbbbbb' });
  });
});
