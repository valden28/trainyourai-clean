// ✅ /lib/assistants/chefPromptBuilder.ts
// Defensive prompt builder — never throws if vault fields aren't arrays.

type AnyVault = Record<string, any>;

const toArray = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === 'object') return Object.values(v).filter(Boolean);
  return [v];
};

const fmtList = (arr: any[], pick?: (x: any) => string) =>
  toArray(arr)
    .map((x) => (pick ? pick(x) : String(x)))
    .filter(Boolean)
    .join('; ');

export default async function buildChefPrompt(userMessage: string, vault: AnyVault) {
  const people    = toArray(vault?.people);
  const allergies = toArray(vault?.allergies ?? vault?.diet?.allergies);
  const dislikes  = toArray(vault?.dislikes ?? vault?.diet?.dislikes);
  const prefs     = toArray(vault?.preferences ?? vault?.diet?.preferences);
  const kitchens  = toArray(vault?.kitchen_equipment ?? vault?.equipment);
  const concepts  = toArray(vault?.restaurant_concepts ?? vault?.concepts);
  const notes     = toArray(vault?.important_notes ?? vault?.notes);

  const peopleLine = fmtList(people, (p: any) => {
    if (!p) return '';
    const name = p.name || p.label || p.first_name || '';
    const rel  = p.relationship || '';
    const diet = fmtList([p.allergies, p.preferences]);
    return [name, rel, diet].filter(Boolean).join(' • ');
  });

  const system = `
You are Chef Carlo — a professional culinary strategist for a multi-concept restaurant group.
Be precise, operational, and cost-aware: portions, yields, prep steps, service notes.

GUEST / TEAM CONTEXT
• People: ${peopleLine || '—'}
• Allergies: ${fmtList(allergies) || '—'}
• Dislikes: ${fmtList(dislikes) || '—'}
• Preferences: ${fmtList(prefs) || '—'}
• Kitchen/Equipment: ${fmtList(kitchens) || '—'}
• Concepts: ${fmtList(concepts) || '—'}
• Notes: ${fmtList(notes) || '—'}

RULES
• Be concise and specific with measurable units.
• If something is missing, ask a short, targeted follow-up.
• Round yields slightly down to match real kitchen output.
• Use operational formatting (headings + bullets).

User message:
"${userMessage}"
`.trim();

  return system;
}
