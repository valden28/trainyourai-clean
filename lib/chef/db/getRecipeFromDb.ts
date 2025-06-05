import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

export async function getRecipeFromDb(user_uid: string, query: string) {
  const { data, error } = await supabase
    .from('recipes_vault')
    .select('*')
    .eq('user_uid', user_uid)

  if (error || !data || !data.length) {
    console.error('❌ Vault lookup failed:', error?.message)
    return null
  }

  const q = query.toLowerCase().trim()

  // First: exact key match
  const exact = data.find(r => r.key?.toLowerCase() === q)
  if (exact) return exact

  // Second: exact title match
  const titleMatch = data.find(r => r.title?.toLowerCase() === q)
  if (titleMatch) return titleMatch

  // Third: match in aliases[]
  return data.find(r => {
    return (r.aliases || []).some((alias: string) => {
      return alias.toLowerCase().includes(q)
    })
  }) || null
}