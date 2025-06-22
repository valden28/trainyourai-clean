// lib/chef/db/saveRecipeToDb.ts
import { supabase } from '@/lib/supabaseServer';

export async function saveRecipeToDb(user_uid: string, recipe: any) {
  if (!recipe?.title || !recipe?.key) {
    console.error('❌ Recipe missing title or key:', recipe);
    return 'invalid';
  }

  const { data: existing, error: lookupError } = await supabase
    .from('recipes_vault')
    .select('id')
    .eq('user_uid', user_uid)
    .eq('key', recipe.key)
    .maybeSingle();

  if (lookupError) {
    console.error('❌ Vault lookup failed:', lookupError.message);
    return 'error';
  }

  if (existing) {
    return 'duplicate';
  }

  const { error: insertError } = await supabase.from('recipes_vault').insert({
    user_uid,
    key: recipe.key,
    title: recipe.title,
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    aliases: recipe.aliases || [],
  });

  if (insertError) {
    console.error('❌ Insert error:', insertError.message);
    return 'error';
  }

  return 'saved';
}