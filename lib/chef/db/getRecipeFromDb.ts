import { supabase } from '@/lib/supabaseServer'

export async function getRecipeFromDb(user_uid: string, query: string) {
  const { data, error } = await supabase
    .from('recipes_vault')
    .select('*')
    .eq('user_uid', user_uid)

  if (error || !data) return null

  const q = query.toLowerCase().trim()

  // Exact match
  const exact = data.find(r => r.key === q)
  if (exact) return exact

  // Fuzzy match
  return data.find(r =>
    r.key.includes(q) ||
    r.title.toLowerCase().includes(q) ||
    (r.aliases || []).some(alias => alias.toLowerCase().includes(q))
  ) || null
}