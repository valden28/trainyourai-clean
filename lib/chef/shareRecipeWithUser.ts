// ✅ File: /lib/chef/shareRecipeWithUser.ts

import { getSupabaseClient } from '@/utils/supabaseClient';
import { sendMervMessage } from '@/lib/mervLink/sendMessage';
import { getBestRecipeMatch } from './getBestRecipeMatch';
import { saveRecipeToDb } from './db/saveRecipeToDb';

const supabase = getSupabaseClient();

export async function shareRecipeWithUser({
  owner_uid,
  target_uid,
  recipeQuery,
  approval_mode = 'auto'
}: {
  owner_uid: string;
  target_uid: string;
  recipeQuery: string;
  approval_mode?: 'auto' | 'manual';
}): Promise<{ success: boolean; message: string }> {
  console.log('🔐 Sharing recipe:', recipeQuery, '→', target_uid);

  const match = await getBestRecipeMatch(owner_uid, recipeQuery);

  if (!match) {
    console.warn('❌ No matching recipe found for:', recipeQuery);
    return {
      success: false,
      message: `❌ Could not find a recipe matching “${recipeQuery}” in your vault.`
    };
  }

  const { key, data } = match;
  const resource = `recipes.${key}`;

  // ✅ Make sure recipe is saved before sharing
  const ensureSaved = await saveRecipeToDb(owner_uid, {
    key,
    title: data.title,
    aliases: data.aliases || [],
    ingredients: data.ingredients,
    instructions: data.instructions
  });

  if (ensureSaved !== 'saved' && ensureSaved !== 'duplicate') {
    return {
      success: false,
      message: `❌ Could not verify recipe is stored in your vault.`
    };
  }

  // 🧾 Check if permission already exists
  const { data: existing, error: checkError } = await supabase
    .from('merv_permissions')
    .select('id')
    .eq('owner_uid', owner_uid)
    .eq('allowed_uid', target_uid)
    .eq('assistant', 'chef')
    .eq('resource', resource);

  if (checkError) {
    console.error('❌ Supabase permission check failed:', checkError.message);
    return {
      success: false,
      message: `❌ Failed to check permissions: ${checkError.message}`
    };
  }

  if (existing && existing.length > 0) {
    return {
      success: true,
      message: `⚠️ You’ve already shared “${data.title}” with this person.`
    };
  }

  // 🔐 Grant permission
  const { error: insertError } = await supabase.from('merv_permissions').insert({
    owner_uid,
    allowed_uid: target_uid,
    assistant: 'chef',
    resource,
    access_level: 'read',
    approval_mode
  });

  if (insertError) {
    console.error('❌ Failed to insert sharing permission:', insertError.message);
    return {
      success: false,
      message: `❌ Failed to grant access: ${insertError.message}`
    };
  }

  // ✉️ Send recipe message
  const recipeText = [
    `📬 ${data.title}`,
    '',
    '🧂 Ingredients:',
    ...data.ingredients.map((i: string) => `- ${i}`),
    '',
    '👨‍🍳 Instructions:',
    ...data.instructions.map((step: string, i: number) => `${i + 1}. ${step}`)
  ].join('\n');

  await sendMervMessage(owner_uid, target_uid, recipeText, 'recipe', 'chef');

  return {
    success: true,
    message: `✅ “${data.title}” shared with your contact.`
  };
}