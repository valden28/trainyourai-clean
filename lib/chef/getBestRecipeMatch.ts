import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

export async function getBestRecipeMatch(
  user_uid: string,
  query: string
): Promise<{ key: string; data: any } | null> {
  const { data, error } = await supabase
    .from('recipes_vault')
    .select('*')
    .eq('user_uid', user_uid)

  if (error || !data) {
    console.error('❌ Vault lookup error:', error?.message)
    return null
  }

  const input = query.toLowerCase().replace(/[^a-z0-9]/gi, '')

  const match = data.find((r: any) => {
    const key = r.key?.toLowerCase().replace(/[^a-z0-9]/gi, '')
    const title = r.title?.toLowerCase().replace(/[^a-z0-9]/gi, '')
    const aliases = (r.aliases || []).map((a: string) =>
      a.toLowerCase().replace(/[^a-z0-9]/gi, '')
    )

    return (
      key === input ||
      key.includes(input) ||
      title.includes(input) ||
      aliases.some((alias: string) => alias.includes(input))
    )
  })

  if (!match) return null

  return { key: match.key, data: match }
}