import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();
import { sendMervMessage } from '@/lib/mervLink/sendMessage'
import { getBestRecipeMatch } from './getBestRecipeMatch'

export async function shareRecipeWithUser({
  owner_uid,
  target_uid,
  recipeQuery,
  approval_mode = 'auto'
}: {
  owner_uid: string
  target_uid: string
  recipeQuery: string
  approval_mode?: 'auto' | 'manual'
}): Promise<{ success: boolean; message: string }> {
  console.log('🔐 Vault Lookup: owner_uid =', owner_uid)
  console.log('📦 Recipe Query =', recipeQuery)

  const match = await getBestRecipeMatch(owner_uid, recipeQuery)

  if (!match) {
    console.log('❌ No matching recipe found in sender\'s vault')
    return {
      success: false,
      message: `❌ Could not find "${recipeQuery}" in your vault.`
    }
  }

  const { key, data } = match
  const resource = `recipes.${key}`

  // 🔁 Check if already shared
  const { data: existing, error: checkError } = await supabase
    .from('merv_permissions')
    .select('id')
    .eq('owner_uid', owner_uid)
    .eq('allowed_uid', target_uid)
    .eq('assistant', 'chef')
    .eq('resource', resource)

  if (checkError) {
    console.error('❌ Supabase check error:', checkError.message)
    return {
      success: false,
      message: `❌ Could not verify sharing history: ${checkError.message}`
    }
  }

  if (existing && existing.length > 0) {
    return {
      success: true,
      message: `⚠️ You’ve already shared "${data.title}" with this person.`
    }
  }

  // 👥 Insert new permission
  const { error: insertError } = await supabase.from('merv_permissions').insert({
    owner_uid,
    allowed_uid: target_uid,
    assistant: 'chef',
    resource,
    access_level: 'read',
    approval_mode
  })

  if (insertError) {
    return {
      success: false,
      message: `❌ Failed to grant access: ${insertError.message}`
    }
  }

  // 🧾 Send recipe message
  const recipeText = [
    `📬 ${data.title}`,
    '',
    '🧂 Ingredients:',
    ...data.ingredients.map((i: string) => `- ${i}`),
    '',
    '👨‍🍳 Instructions:',
    ...data.instructions.map((step: string, i: number) => `${i + 1}. ${step}`)
  ].join('\n')

  await sendMervMessage(owner_uid, target_uid, recipeText, 'recipe', 'chef')

  return {
    success: true,
    message: `✅ Recipe "${data.title}" shared with user.`
  }
}