// utils/vaultSummary.ts
// Defensive summary builder for Merv (handles vault.data or flat objects)

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

const clip = (s: string, n = 300) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

export default function generateVaultSummary(raw: AnyVault): string {
  if (!raw) return 'No vault data available.';

  // If your row has a JSONB field "data", merge it in so we can read either shape.
  const base: AnyVault =
    raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object'
      ? { ...raw, ...raw.data }
      : raw;

  const name       = base.name || base.full_name || base.user_name || '';
  const role       = base.role || base.title || '';
  const locale     = base.locale || base.location || base.city || '';

  const people     = toArray(base.people);
  const prefs      = toArray(base.preferences ?? base.diet?.preferences);
  const dislikes   = toArray(base.dislikes  ?? base.diet?.dislikes);
  const allergies  = toArray(base.allergies ?? base.diet?.allergies);
  const goals      = toArray(base.goals ?? base.objectives);
  const interests  = toArray(base.interests ?? base.hobbies);
  const equipment  = toArray(base.kitchen_equipment ?? base.equipment);
  const notes      = toArray(base.notes ?? base.important_notes);

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
