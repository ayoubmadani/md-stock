// الملف الشخصي: تغيير كلمة السر (PATCH /user/password)
// حساب Google فقط: يضع كلمة سر أولى بلا الحالية؛ غيره: الحالية مطلوبة

export const MIN_PASSWORD = 8;

export const hasPassword = (provider) => provider !== 'GOOGLE';

// نفس قاعدة الـ API (md-store-api/src/user/password-policy.ts): حروف وأرقام، لا تسلسل ولا تكرار ولا كلمة شائعة
const COMMON = new Set([
  'password', 'passw', 'motdepasse', 'azerty', 'azertyuiop', 'qwerty', 'qwertyuiop', 'admin', 'welcome', 'letmein',
  'iloveyou', 'monkey', 'dragon', 'football', 'sunshine', 'princess', 'algerie', 'algeria', 'dzair', 'mdstore', 'bonjour',
]);
const isRun = (s) => {
  if (s.length < 3) return false;
  const d = s.charCodeAt(1) - s.charCodeAt(0);
  if (Math.abs(d) > 1) return false;
  for (let i = 2; i < s.length; i++) if (s.charCodeAt(i) - s.charCodeAt(i - 1) !== d) return false;
  return true;
};
export function isWeakPassword(pw) {
  const s = String(pw ?? '');
  if (s.length < MIN_PASSWORD || !/\p{L}/u.test(s) || !/\d/.test(s)) return true;
  const low = s.toLowerCase();
  if (isRun(low)) return true;
  const base = low.replace(/^\d+|\d+$/g, '');
  return COMMON.has(base) || isRun(base);
}

/** مفتاح الخطأ (profile.err_*) أو null */
export function passwordFormError({ current, next, confirm }, withCurrent) {
  if (withCurrent && !current) return 'current_required';
  if ((next || '').length < MIN_PASSWORD) return 'too_short';
  if (isWeakPassword(next)) return 'weak';
  if (next !== confirm) return 'mismatch';
  return null;
}

export const passwordBody = ({ current, next }, withCurrent) => (withCurrent ? { password: current, newPassword: next } : { newPassword: next });
