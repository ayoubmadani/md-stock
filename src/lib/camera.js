// الكاميرا لا تركّز على ما هو أقرب من 10–15 سم: تكبير ×2 يجعل الملصق كبيراً في الإطار والهاتف بعيد بما يكفي للتركيز.
// هواتف لا تدعم التكبير (Safari على آيفون) تبقى كما هي — بلا خطأ
export async function applyZoom(track, want = 2) {
  const zoom = track?.getCapabilities?.()?.zoom;
  if (!zoom || typeof zoom.max !== 'number') return null;
  const value = Math.min(Math.max(want, zoom.min ?? 1), zoom.max);
  try {
    await track.applyConstraints({ advanced: [{ zoom: value }] });
    return value;
  } catch {
    return null;
  }
}
