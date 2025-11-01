// ✅ utils/vaultSummary.ts
// Defensive summary builder that merges vault row + vault.data + vault.innerview (+ tonesync)

type Any = Record<string, any>;

const toArray = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === 'object') return Object.values(v).filter(Boolean);
  return [v];
};

const join = (arr: any[], pick?: (x: any) => string) =>
  toArray(arr).map((x) => (pick ? pick(x) : String(x))).filter(Boolean).join(', ');

const clip = (s: string, n = 300) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

export default function generateVaultSummary(raw: Any): string {
  if (!raw) return 'No vault data available.';

  // Merge shapes: row + data + innerview (+ tonesync as hints)
  const base: Any = {
    ...(raw || {}),
    ...(typeof raw.data === 'object' ? raw.data : {}),
    ...(typeof raw.innerview === 'object' ? raw.innerview : {}),
  };

  // Try multiple key shapes people often use
  const name =
    base.name || base.full_name || base.identity?.name || base.user_name || '';
  const role =
    base.role || base.identity?.role || base.title || base.bio || '';
  const locale =
    base.location || base.locale || base.city || base.identity?.location || '';

  // Common arrays we might find in either object
  const people     = toArray(base.people);
  const prefs      = toArray(base.preferences ?? base.diet?.preferences);
  const dislikes   = toArray(base.dislikes  ?? base.diet?.dislikes);
  const allergies  = toArray(base.allergies ?? base.diet?.allergies);
  const goals      = toArray(base.goals ?? base.objectives);
  const interests  = toArray(base.interests ?? base.hobbies);
  const equipment  = toArray(base.kitchen_equipment ?? base.equipment);
  const notes      = toArray(base.notes ?? base.important_notes ?? base.bio);

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
    // optional tonesync preview if present
    base.tonesync ? `ToneSync: ${JSON.stringify(base.tonesync)}` : '',
  ].filter(Boolean);

  return lines.length ? lines.join('\n') : 'No notable profile fields on record.';
}
