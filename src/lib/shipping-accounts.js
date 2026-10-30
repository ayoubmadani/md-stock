// حسابات شركات التوصيل: الحقول التي تطلبها كل شركة (نفس اللوحة)

export function credentialKeys(providerName) {
  if (!providerName) return [];
  if (['Yalidine', 'Yalitec'].includes(providerName)) return ['id', 'token'];
  if (providerName === 'ZRExpress') return ['token', 'key'];
  return ['token'];
}

export const canSave = (providerName, accountName, creds) =>
  !!String(accountName ?? '').trim() && credentialKeys(providerName).every((k) => String(creds?.[k] ?? '').trim());

/** تعديل حساب: الاسم دائماً، والمفاتيح فقط إن كُتبت كلها (فارغة = تبقى القديمة) */
export function editPayload(providerName, accountName, creds) {
  const body = { accountName: String(accountName ?? '').trim() };
  const keys = credentialKeys(providerName);
  if (keys.every((k) => String(creds?.[k] ?? '').trim())) body.credentials = Object.fromEntries(keys.map((k) => [k, String(creds[k]).trim()]));
  return body;
}

/** المالك يرى كل الحسابات؛ عضو الفريق يرى الحساب المختار للمتجر فقط */
export const visibleAccounts = (accounts, isOwner) => (isOwner ? accounts : accounts.filter((a) => a.isDefault));
