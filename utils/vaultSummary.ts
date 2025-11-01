// utils/vaultSummary.ts
// Defensive summary builder for Merv (never .map on non-arrays)

type AnyVault = Record<string, any>;

const toArray = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === 'object') return Object.values(v).filter(Boolean);
  return [v];
};

const join = (arr: any[], pick?: (x: any) => string) =>
  toArray(arr)
    .map((x) => (pick ? pick(x) : String(x)))
    .filter(Boolean)
    .join(', ');

const clip = (s: string, n = 300) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export default function generateVaultSummary(vault: AnyVault): string {
  if (!vault) return 'No vault data available.';

  const name       = vault.name || vault.full_name || vault.user_name || '';
  const role       = vault.role || vault.title || '';
  const locale     = vault.locale || vault.location || vault.city || '';

  const people     = toArray(vault.people);
  const prefs      = toArray(vault.preferences ?? vault.diet?.preferences);
  const dislikes   = toArray(vault.dislikes  ?? vault.diet?.dislikes);
  const allergies  = toArray(vault.allergies ?? vault.diet?.allergies);
  const goals      = toArray(vault.goals ?? vault.objectives);
  const interests  = toArray(vault.interests ?? vault.hobbies);
  const equipment  = toArray(vault.kitchen_equipment ?? vault.equipment);
  const notes      = toArray(vault.notes ?? vault.important_notes);

  const peopleLine = join(people, (p: any) => {
    if (!p) return '';
    const nm  = p.name || p.label || p.first_name || '';
    const rel = p.relationship || '';
    const diet = join([p.allergies, p.preferences]);
    return [nm, rel, diet].filter(Boolean).join(' • ');
  });

  const lines = [
    name || role ? `Identity: ${[name, role].filter(Boolean).join(' — ')}` : '',
    locale ? `Location: ${locale}` : '',
    allergies.length ? `Allergies: ${join(allergies)}` : '',
    prefs.length ? `Preferences: ${join(prefs)}` : '',
    dislikes.length ? `Dislikes: ${join(dislikes)}` : '',
    equipment.length ? `Equipment: ${join(equipment)}` : '',
    interests.length ? `Interests: ${join(interests)}` : '',
    goals.length ? `Goals: ${join(goals)}` : '',
    notes.length ? `Notes: ${clip(join(notes))}` : '',
    people.length ? `Contacts: ${peopleLine}` : '',
  ].filter(Boolean);

  return lines.length ? lines.join('\n') : 'No notable profile fields on record.';
}
