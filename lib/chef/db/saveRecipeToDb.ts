// lib/chef/db/saveRecipeToDb.ts
import { supabase } from '@/lib/supabaseServer';

export async function saveRecipeToDb(user_uid: string, recipe: any) {
  if (!recipe?.title || !recipe?.key) {
    console.error('❌ Recipe missing title or key:', recipe);
    return 'invalid';
  }

  console.log(`🧾 Saving recipe for user ${user_uid}:`, recipe.title);

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
    console.warn(`⚠️ Recipe already exists: ${recipe.key} for user ${user_uid}`);
    return 'duplicate';
  }

  const { data: insertData, error: insertError } = await supabase
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

  if (!insertData || insertData.length === 0) {
    console.error('❌ Insert succeeded but no rows returned.');
    return 'error';
  }

  console.log('✅ Recipe saved to Supabase vault:', insertData[0]);
  return 'saved';
}