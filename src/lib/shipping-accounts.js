// حسابات شركات التوصيل: الحقول التي تطلبها كل شركة (نفس اللوحة)

export function credentialKeys(providerName) {
  if (!providerName) return [];
  if (['Yalidine', 'Yalitec'].includes(providerName)) return ['id', 'token'];
  if (providerName === 'ZRExpress') return ['token', 'key'];
  return ['token'];
}

export const canSave = (providerName, accountName, creds) =>
  !!String(accountName ?? '').trim() && credentialKeys(providerName).every((k) => String(creds?.[k] ?? '').trim());
