import { describe, it, expect } from 'vitest';
import { MAX_ACCOUNTS, tokenUserId, upsertAccount, removeAccount, markExpired, nextAccount, setAccountStore, canAddAccount } from './accounts';

// رمز JWT وهمي: الحمولة فقط تهم ({ sub })
const jwt = (sub) => `x.${btoa(JSON.stringify({ sub, role: 'user' })).replace(/=+$/, '')}.y`;
const acc = (id, extra = {}) => ({ id, token: jwt(id), email: `${id}@x.com`, name: id, image: null, storeId: null, expired: false, ...extra });

describe('tokenUserId', () => {
  it('reads the user id (sub) from the token', () => {
    expect(tokenUserId(jwt('u-1'))).toBe('u-1');
  });
  it('broken or missing token → null', () => {
    expect(tokenUserId('nope')).toBeNull();
    expect(tokenUserId(null)).toBeNull();
  });
});

describe('upsertAccount', () => {
  it('adds a new account at the end', () => {
    expect(upsertAccount([acc('a')], acc('b')).map((a) => a.id)).toEqual(['a', 'b']);
  });
  it('same account logs in again: replaced in place, fresh token, no longer expired', () => {
    const list = upsertAccount([acc('a', { expired: true, storeId: 's1' }), acc('b')], { ...acc('a'), token: 'new' });
    expect(list.map((a) => a.id)).toEqual(['a', 'b']);
    expect(list[0]).toMatchObject({ token: 'new', expired: false, storeId: 's1' });
  });
});

describe('removeAccount / markExpired / setAccountStore', () => {
  it('removes only that account', () => {
    expect(removeAccount([acc('a'), acc('b')], 'a').map((a) => a.id)).toEqual(['b']);
  });
  it('marks an account as needing a new login', () => {
    expect(markExpired([acc('a'), acc('b')], 'b')[1].expired).toBe(true);
  });
  it('remembers the last store per account', () => {
    expect(setAccountStore([acc('a'), acc('b')], 'a', 's9')[0].storeId).toBe('s9');
  });
});

describe('nextAccount', () => {
  it('after logging out of the current one: the next account that still has a session', () => {
    expect(nextAccount([acc('a'), acc('b', { expired: true }), acc('c')], 'a')?.id).toBe('c');
  });
  it('nothing left → null (login screen)', () => {
    expect(nextAccount([acc('a'), acc('b', { expired: true })], 'a')).toBeNull();
  });
});

describe('canAddAccount', () => {
  it(`at most ${MAX_ACCOUNTS} accounts on one phone`, () => {
    expect(MAX_ACCOUNTS).toBe(5);
    expect(canAddAccount(Array.from({ length: 4 }, (_, i) => acc('a' + i)))).toBe(true);
    expect(canAddAccount(Array.from({ length: 5 }, (_, i) => acc('a' + i)))).toBe(false);
  });
});
