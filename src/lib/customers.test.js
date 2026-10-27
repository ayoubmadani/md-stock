import { describe, expect, it } from 'vitest';
import { EMPTY_CUSTOMER, customerBody, customerToForm, customerReady } from './customers';

describe('customer form (customers table)', () => {
  it('body for POST/PATCH /stores/:s/customers — trimmed, empty optional fields = null', () => {
    expect(customerBody({ ...EMPTY_CUSTOMER, name: ' Karim ', phone: ' 0555123456 ' })).toEqual({ name: 'Karim', phone: '0555123456', phone2: null, photoUrl: null });
  });
  it('an API customer becomes a form (nulls → empty strings)', () => {
    expect(customerToForm({ id: 'c1', name: 'K', phone: '0555123456', phone2: null, photoUrl: 'https://x/p.webp' }))
      .toEqual({ name: 'K', phone: '0555123456', phone2: '', photoUrl: 'https://x/p.webp' });
  });
  it('ready to save only with a name and a phone', () => {
    expect(customerReady({ ...EMPTY_CUSTOMER, name: 'K' })).toBe(false);
    expect(customerReady({ ...EMPTY_CUSTOMER, name: 'K', phone: '0555' })).toBe(true);
  });
});
