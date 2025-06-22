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
    console.log(`⚠️ Duplicate recipe found in vault: "${recipe.key}" for ${user_uid}`);
    return 'duplicate';
  }

  const { error: insertError, data: insertData } = await supabase
    .from('recipes_vault')
    .insert({
      user_uid,
      key: recipe.key,
      title: recipe.title,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      aliases: recipe.aliases || [],
    })
    .select();

  if (insertError) {
    console.error('❌ Insert error:', insertError.message);
    return 'error';
  }

  if (!insertData || !insertData.length) {
    console.error('❌ Insert succeeded but returned no data.');
    return 'error';
  }

  console.log('✅ Recipe successfully saved to Supabase:', {
    user_uid,
    key: recipe.key,
    title: recipe.title,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions
  });

  return 'saved';
}