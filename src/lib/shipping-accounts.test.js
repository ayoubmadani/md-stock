import { describe, expect, it } from 'vitest';
import { credentialKeys, canSave, editPayload, visibleAccounts } from './shipping-accounts';

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

describe('editPayload', () => {
  it('sends the new name, and the keys only when all of them are typed', () => {
    expect(editPayload('Yalidine', ' Main ', { id: '1' })).toEqual({ accountName: 'Main' });
    expect(editPayload('Yalidine', 'Main', { id: '1', token: 't' })).toEqual({ accountName: 'Main', credentials: { id: '1', token: 't' } });
  });
});

describe('visibleAccounts', () => {
  const list = [{ id: 'a', isDefault: false }, { id: 'b', isDefault: true }];
  it('the owner sees every account, a team member only the one selected for the store', () => {
    expect(visibleAccounts(list, true)).toBe(list);
    expect(visibleAccounts(list, false)).toEqual([{ id: 'b', isDefault: true }]);
  });
});
