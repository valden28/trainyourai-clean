import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

export async function saveRecipeToDb(user_uid: string, recipe: {
  key: string
  title: string
  aliases?: string[]
  ingredients: string[]
  instructions: string[]
}): Promise<'saved' | 'duplicate' | 'error'> {
  const key = recipe.key.toLowerCase()

  // Check if recipe already exists
  const { data, error: fetchError } = await supabase
    .from('recipes_vault')
    .select('id')
    .eq('user_uid', user_uid)
    .eq('key', key)
    .maybeSingle()

  if (fetchError) {
    console.error('❌ Error checking for existing recipe:', fetchError.message)
    return 'error'
  }

  if (data) {
    console.log('⚠️ Duplicate recipe detected:', key)
    return 'duplicate'
  }

  const { error } = await supabase.from('recipes_vault').insert({
    user_uid,
    key,
    title: recipe.title,
    aliases: recipe.aliases || [],
    ingredients: recipe.ingredients,
    instructions: recipe.instructions
  })

  if (error) {
    console.error('❌ Error saving recipe:', error.message)
    return 'error'
  }

  console.log('✅ Recipe saved:', key)
  return 'saved'
}