import { api } from './api';

// ملصق الشحن (بوليصة بالباركود) — نفس رابط اللوحة: الـ API يرجع رابط ملف الشركة (ZR) أو PDF

const pdfBlobUrl = (b64) => {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
};

export const labelLinks = (files, toBlobUrl = pdfBlobUrl) =>
  (files ?? []).filter((f) => f?.data).map((f) => (f.type === 'pdf' ? toBlobUrl(f.data) : f.data));

/** من نقرة الزر مباشرة: النافذة تُفتح قبل انتظار الشبكة (وإلا يمنعها المتصفح) */
export async function printLabels(storeId, orderIds) {
  const win = window.open('', '_blank');
  try {
    const { data } = await api.post(`/stores/${storeId}/shipping/labels`, { orderIds });
    const links = labelLinks(data?.files);
    if (links.length && win) win.location.href = links[0];
    else win?.close();
    return { links, failed: data?.failed ?? [] };
  } catch (e) {
    win?.close();
    throw e;
  }
}
