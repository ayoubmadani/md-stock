import { describe, expect, it } from 'vitest';
import { credentialKeys, canSave } from './shipping-accounts';

describe('credentialKeys', () => {
  it('matches what each delivery company asks for (same as the dashboard)', () => {
    expect(credentialKeys('Yalidine')).toEqual(['id', 'token']);
    expect(credentialKeys('Yalitec')).toEqual(['id', 'token']);
    expect(credentialKeys('ZRExpress')).toEqual(['token', 'key']);
    expect(credentialKeys('Noest')).toEqual(['token']);
    expect(credentialKeys(null)).toEqual([]);
  });
});

describe('canSave', () => {
  it('needs an account name and every credential', () => {
    expect(canSave('Yalidine', 'Main', { id: '1', token: 't' })).toBe(true);
    expect(canSave('Yalidine', 'Main', { id: '1', token: ' ' })).toBe(false);
    expect(canSave('Noest', ' ', { token: 't' })).toBe(false);
  });
});
