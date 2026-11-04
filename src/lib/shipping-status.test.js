import { describe, it, expect } from 'vitest';
import { shipStatusInfo } from './shipping-status.js';

describe('courier status for display', () => {
  it('nothing from the courier yet → null', () => {
    expect(shipStatusInfo({})).toBeNull();
    expect(shipStatusInfo({ shippingStatus: null })).toBeNull();
  });
  it('failed delivery is urgent (call the customer), keeps the raw courier wording', () => {
    const s = shipStatusInfo({ shippingStatus: 'failed_delivery', shippingProviderStatus: 'Echèc livraison' });
    expect(s.urgent).toBe(true);
    expect(s.raw).toBe('Echèc livraison');
    expect(s.tone).toContain('amber');
  });
  it('a code the app does not know yet is shown as unknown', () => {
    expect(shipStatusInfo({ shippingStatus: 'teleported' }).code).toBe('unknown');
    expect(shipStatusInfo({ shippingStatus: 'delivered' }).urgent).toBe(false);
  });
});
