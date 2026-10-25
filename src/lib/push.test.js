import { beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn(async () => ({}));
vi.mock('./api', () => ({ api: { post: (...a) => post(...a), get: vi.fn() } }));
const { syncPush, releasePush } = await import('./push.js');

function phone(sub) {
  const reg = { pushManager: { getSubscription: async () => sub } };
  Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker: { getRegistration: async () => reg } }, configurable: true });
  globalThis.window = Object.assign(globalThis.window || {}, { PushManager: function () {}, Notification: function () {} });
  globalThis.Notification = { permission: 'granted' };
}

describe('push on account change', () => {
  beforeEach(() => post.mockClear());

  it('after login, a phone that already has a subscription is registered for the new account', async () => {
    phone({ endpoint: 'https://push/e1', toJSON: () => ({ endpoint: 'https://push/e1', keys: { p256dh: 'k', auth: 'a' } }) });
    await syncPush();
    expect(post).toHaveBeenCalledWith('/push/subscribe', { endpoint: 'https://push/e1', keys: { p256dh: 'k', auth: 'a' } });
  });

  it('no subscription on the phone → nothing sent', async () => {
    phone(null);
    await syncPush();
    expect(post).not.toHaveBeenCalled();
  });

  it('on logout, the phone is removed from this account on the server', async () => {
    phone({ endpoint: 'https://push/e1', toJSON: () => ({}) });
    await releasePush();
    expect(post).toHaveBeenCalledWith('/push/unsubscribe', { endpoint: 'https://push/e1' });
  });
});
