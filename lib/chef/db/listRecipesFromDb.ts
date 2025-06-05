import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

export async function listRecipesFromDb(user_uid: string) {
  const { data, error } = await supabase
    .from('recipes_vault')
    .select('title, key')
    .eq('user_uid', user_uid)
    .order('created_at', { ascending: false })

  return data || []
}