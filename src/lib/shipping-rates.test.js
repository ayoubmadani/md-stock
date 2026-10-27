import { describe, expect, it } from 'vitest';
import { applyBulk, applyRates, extractHomeOfficePrices, rowPayload, communeChanges, communeSnapshot, communesOff } from './shipping-rates';

const W = [
  { id: 16, code: 16, name: 'Alger', livraisonHome: 400, livraisonOfice: 300, livraisonReturn: 200, isActive: true },
  { id: 31, code: 31, name: 'Oran', livraisonHome: 700, livraisonOfice: 500, livraisonReturn: 250, isActive: true },
];

describe('delivery company rates', () => {
  it('reads home / office prices whatever the company names them', () => {
    expect(extractHomeOfficePrices({ tarif_domicile: '450', tarif_stopdesk: 350 })).toEqual({ home: 450, office: 350 });
    expect(extractHomeOfficePrices({ TarifDomicile: 900 })).toEqual({ home: 900, office: undefined });
  });
  it('applies matching wilayas only and counts them (Yalidine wilaya_id / ZR IDWilaya)', () => {
    const { list, matched } = applyRates(W, [{ wilaya_id: 16, tarif_domicile: 450, tarif_stopdesk: 350 }, { IDWilaya: 99, tarif: 1 }]);
    expect(matched).toBe(1);
    expect(list[0]).toMatchObject({ livraisonHome: 450, livraisonOfice: 350, livraisonReturn: 200 });
    expect(list[1]).toEqual(W[1]);
  });
});

describe('bulk prices', () => {
  it('sets only the filled fields, on the given wilayas', () => {
    const out = applyBulk(W, [31], { home: '800', office: '', ret: '300' });
    expect(out[0]).toEqual(W[0]);
    expect(out[1]).toMatchObject({ livraisonHome: 800, livraisonOfice: 500, livraisonReturn: 300 });
  });
});

it('save payload matches the dashboard (home/office enabled unless false)', () => {
  expect(rowPayload({ ...W[0], officeEnabled: false })).toEqual({ wilayaId: 16, priceHome: 400, priceOffice: 300, priceReturn: 200, isActive: true, homeEnabled: true, officeEnabled: false });
});

describe('communes', () => {
  const list = [{ id: 1, homeEnabled: true, officeEnabled: true }, { id: 2, homeEnabled: false, officeEnabled: true }];
  it('sends only the communes whose home/office changed', () => {
    const initial = communeSnapshot(list);
    const now = [{ ...list[0], officeEnabled: false }, list[1]];
    expect(communeChanges(now, initial)).toEqual([{ communeId: 1, homeEnabled: true, officeEnabled: false }]);
  });
  it('counts a commune as off when both home and office are off', () => {
    expect(communesOff([{ homeEnabled: false, officeEnabled: false }, { homeEnabled: false, officeEnabled: true }])).toBe(1);
  });
});
