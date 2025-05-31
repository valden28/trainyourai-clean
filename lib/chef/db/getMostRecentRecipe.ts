import { supabase } from '@/lib/supabaseServer'

export async function getMostRecentRecipe(user_uid: string) {
  const { data, error } = await supabase
    .from('merv_messages')
    .select('*')
    .eq('receiver_uid', user_uid)
    .eq('assistant', 'chef')
    .eq('category', 'recipe')
    .order('timestamp', { ascending: false })
    .limit(10)

  if (error || !data || !data.length) {
    console.error('❌ No valid recipe messages found:', error?.message)
    return null
  }

  const valid = data.find((msg: any) => msg.message?.trim().startsWith('📬'))
  if (!valid) return null

  const lines = valid.message.split('\n')
  const title = lines[0]?.replace('📬', '').trim() || 'Untitled'

  const ingIndex = lines.findIndex((l: string) => l.includes('🧂'))
  const instrIndex = lines.findIndex((l: string) => l.includes('👨‍🍳'))

  const ingredients = lines.slice(ingIndex + 1, instrIndex).filter(Boolean)
  const instructions = lines.slice(instrIndex + 1).filter(Boolean)

  return {
    key: title.toLowerCase().replace(/\s+/g, ''),
    title,
    aliases: [],
    ingredients,
    instructions
  }
}