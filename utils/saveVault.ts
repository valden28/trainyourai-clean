// utils/saveVault.ts
export async function saveInnerViewToVault(innerViewJSON: any) {
  const res = await fetch('/api/vault/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(innerViewJSON),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Vault save failed: ${t}`);
  }
  return true;
}
