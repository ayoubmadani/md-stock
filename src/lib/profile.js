// الملف الشخصي: تغيير كلمة السر (PATCH /user/password)
// حساب Google فقط: يضع كلمة سر أولى بلا الحالية؛ غيره: الحالية مطلوبة

export const MIN_PASSWORD = 8;

export const hasPassword = (provider) => provider !== 'GOOGLE';

/** مفتاح الخطأ (profile.err_*) أو null */
export function passwordFormError({ current, next, confirm }, withCurrent) {
  if (withCurrent && !current) return 'current_required';
  if ((next || '').length < MIN_PASSWORD) return 'too_short';
  if (next !== confirm) return 'mismatch';
  return null;
}

export const passwordBody = ({ current, next }, withCurrent) => (withCurrent ? { password: current, newPassword: next } : { newPassword: next });
