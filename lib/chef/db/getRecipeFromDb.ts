import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

export async function getRecipeFromDb(user_uid: string, query: string) {
  const q = query.toLowerCase().replace(/[^a-z0-9]/gi, '');

  const { data, error } = await supabase
    .from('recipes_vault')
    .select('*')
    .eq('user_uid', user_uid);

  if (error || !data) {
    console.error('❌ Error fetching recipes from vault:', error?.message);
    return null;
  }

  // First: exact key match
  const exact = data.find(r => typeof r.key === 'string' && r.key.toLowerCase() === q);
  if (exact) return exact;

  // Second: exact title match
  const titleMatch = data.find(r => typeof r.title === 'string' && r.title.toLowerCase().includes(q));
  if (titleMatch) return titleMatch;

  // Third: alias match
  const aliasMatch = data.find(r =>
    Array.isArray(r.aliases) &&
    r.aliases.some((alias: any) =>
      typeof alias === 'string' && alias.toLowerCase().includes(q)
    )
  );

  return aliasMatch || null;
}