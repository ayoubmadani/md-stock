// فتح رابط Binance في تطبيق Binance نفسه على الهاتف
// Android: رابط intent مباشر للتطبيق (وإلا صفحة الويب)؛ iPhone: نفس الصفحة (لا تبويب جديد) فيفتحه التطبيق
export function binanceAppUrl(url, ua = navigator.userAgent) {
  if (!/android/i.test(ua)) return url;
  const rest = url.replace(/^https?:\/\//, '');
  return `intent://${rest}#Intent;scheme=https;package=com.binance.dev;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

export function openBinance(url) {
  window.location.href = binanceAppUrl(url);
}
