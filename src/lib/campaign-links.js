// حملات Meta من نافذة إعلانات منتج: المربوطة به أولاً، ثم الحرة (الأكثر مصروفاً أولاً)، ثم المربوطة بمنتج آخر
const ORDER = { here: 0, free: 1, other: 2 };

export const campaignsFor = (list, productId) => (list ?? [])
  .map((c) => ({ ...c, link: c.productId === productId ? 'here' : c.productId ? 'other' : 'free' }))
  .sort((a, b) => ORDER[a.link] - ORDER[b.link] || Number(b.spend) - Number(a.spend));
