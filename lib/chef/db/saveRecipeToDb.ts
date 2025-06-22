// lib/chef/db/saveRecipeToDb.ts
import { supabase } from '@/lib/supabaseServer';

interface RecipeInput {
  key: string;
  title: string;
  aliases?: string[];
  ingredients: string[];
  instructions: string[];
}

export async function saveRecipeToDb(
  user_uid: string,
  recipe: RecipeInput
): Promise<'saved' | 'duplicate' | 'error' | 'invalid'> {
  if (
    !user_uid ||
    !recipe?.title ||
    !recipe?.key ||
    !Array.isArray(recipe.ingredients) ||
    !Array.isArray(recipe.instructions)
  ) {
    console.error('❌ Invalid input to saveRecipeToDb:', { user_uid, recipe });
    return 'invalid';
  }

  const key = recipe.key.toLowerCase().replace(/\s+/g, '');

  const { data: existing, error: lookupError } = await supabase
    .from('recipes_vault')
    .select('id')
    .eq('user_uid', user_uid)
    .eq('key', key)
    .maybeSingle();

  if (lookupError) {
    console.error('❌ Vault lookup failed:', lookupError.message);
    return 'error';
  }

  if (existing) {
    console.log(`⚠️ Recipe already exists: ${key}`);
    return 'duplicate';
  }

  const { error: insertError } = await supabase.from('recipes_vault').insert({
    user_uid,
    key,
    title: recipe.title.trim(),
    aliases: recipe.aliases || [],
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  });

  if (insertError) {
    console.error('❌ Insert error:', insertError.message);
    return 'error';
  }

  console.log(`✅ Saved recipe: ${recipe.title} for user ${user_uid}`);
  return 'saved';
}