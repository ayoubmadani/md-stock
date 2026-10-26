// أسعار التوصيل: استيراد أسعار شركة التوصيل، سعر واحد لعدة ولايات، وجسم الحفظ (نفس اللوحة)

function pickPrice(rate, keys) {
  for (const k of keys) {
    const raw = rate?.[k];
    if (raw === undefined || raw === null || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export const extractHomeOfficePrices = (rate) => ({
  home: pickPrice(rate, ['tarif_domicile', 'domicile', 'home', 'express_home', 'TarifDomicile', 'tarif', 'Tarif', 'price']),
  office: pickPrice(rate, ['tarif_stopdesk', 'stopdesk', 'desk', 'express_desk', 'TarifStopDesk', 'bureau']),
});

const rateFor = (rates, wilayaId) => rates.find((r) => Number(r?.wilaya_id ?? r?.IDWilaya ?? r?.id) === Number(wilayaId));

/** أسعار الشركة ← الولايات المطابقة فقط (سعر الإرجاع لا يتغير) */
export function applyRates(wilayas, rates) {
  let matched = 0;
  const list = wilayas.map((w) => {
    const r = rateFor(rates, w.code ?? w.id);
    if (!r) return w;
    const { home, office } = extractHomeOfficePrices(r);
    if (home === undefined && office === undefined) return w;
    matched += 1;
    return { ...w, livraisonHome: home ?? w.livraisonHome, livraisonOfice: office ?? w.livraisonOfice };
  });
  return { list, matched };
}

/** سعر واحد لعدة ولايات — الخانة الفارغة لا تُغيّر شيئاً */
export function applyBulk(wilayas, ids, { home, office, ret }) {
  const set = new Set(ids);
  const num = (v) => (v === '' || v === undefined ? undefined : Number(v));
  return wilayas.map((w) => (set.has(w.id) ? {
    ...w,
    ...(num(home) !== undefined && { livraisonHome: num(home) }),
    ...(num(office) !== undefined && { livraisonOfice: num(office) }),
    ...(num(ret) !== undefined && { livraisonReturn: num(ret) }),
  } : w));
}

export const rowPayload = (w) => ({
  wilayaId: w.id, priceHome: w.livraisonHome, priceOffice: w.livraisonOfice, priceReturn: w.livraisonReturn,
  isActive: w.isActive, homeEnabled: w.homeEnabled !== false, officeEnabled: w.officeEnabled !== false,
});
