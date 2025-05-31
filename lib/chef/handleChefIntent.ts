import { sendMervMessage } from '@/lib/mervLink/sendMessage'
import { saveRecipeToDb } from './db/saveRecipeToDb'
import { getRecipeFromDb } from './db/getRecipeFromDb'
import { listRecipesFromDb } from './db/listRecipesFromDb'
import { shareRecipeWithUser } from './shareRecipeWithUser'
import { resolveContactName } from '@/lib/contacts/resolveContactName'
import { getMostRecentRecipe } from './db/getMostRecentRecipe'
import { supabase } from '@/lib/supabaseServer'
export async function handleChefIntent({
  sender_uid,
  receiver_uid,
  message
}: {
  sender_uid: string
  receiver_uid: string
  message: string
}) {
  console.log('🧠 Incoming chef intent message:', message)

  const lower = message.toLowerCase()

  // 💾 Save recipe just received
  if (lower.startsWith('save this') && lower.includes('to my vault')) {
    const recent = await getMostRecentRecipe(sender_uid)

    if (!recent) {
      await sendMervMessage(receiver_uid, sender_uid, '❌ No recent recipe found to save.', 'vault_response', 'chef')
      return { status: 'not_found' }
    }

    const saved = await saveRecipeToDb(sender_uid, recent)

    const response = saved === 'saved'
      ? `✅ “${recent.title}” has been saved to your vault.`
      : saved === 'duplicate'
        ? `⚠️ You’ve already saved “${recent.title}.”`
        : `❌ Failed to save recipe.`

    await sendMervMessage(receiver_uid, sender_uid, response, 'vault_response', 'chef')
    return { status: saved }
  }

  // 📝 Save command
  if (lower.startsWith('save this as')) {
    const title = message.replace(/^save this as/i, '').trim()
    const key = title.toLowerCase().replace(/\s+/g, '')

    const result = await saveRecipeToDb(sender_uid, {
      key,
      title,
      aliases: [],
      ingredients: ['[user-defined]'],
      instructions: ['[user-defined]']
    })

    const msg =
      result === 'saved' ? `✅ Saved “${title}” to your vault.` :
      result === 'duplicate' ? `⚠️ You’ve already saved “${title}.”` :
      `❌ Something went wrong while saving.`

    await sendMervMessage(receiver_uid, sender_uid, msg, 'vault_response', 'chef')
    return { status: result }
  }

  // 📚 Vault listing
  if (lower.includes('what') && lower.includes('recipes') && lower.includes('saved')) {
    const recipes = await listRecipesFromDb(sender_uid)
    const list = recipes.length
      ? recipes.map((r: any) => `- ${r.title}`).join('\n')
      : '❌ No saved recipes yet.'

    const response = recipes.length
      ? `📚 Your saved recipes:\n${list}`
      : list

    await sendMervMessage(receiver_uid, sender_uid, response, 'vault_response', 'chef')
    return { status: 'listed' }
  }

  // 📜 Shared history query (Den only for now)
  if (sender_uid !== 'auth0|6825cc5ba058089b86c4edc0') {
    await sendMervMessage(receiver_uid, sender_uid, '⚠️ Only Den can view sharing history for now.', 'vault_response', 'chef')
    return { status: 'unauthorized' }
  }

  if (lower.startsWith('what have i shared with')) {
    const name = message
      .replace(/^what have i shared with/i, '')
      .replace(/[?.,!]$/, '')
      .trim()

    const resolve = await resolveContactName(sender_uid, name)

    if (!resolve.success) {
      const fallback = resolve.reason === 'ambiguous'
        ? `🔍 You have multiple contacts named ${name}. Be more specific.`
        : `❌ Could not find anyone named ${name}.`

      await sendMervMessage(receiver_uid, sender_uid, fallback, 'vault_response', 'chef')
      return { status: 'error' }
    }

    const { data, error } = await supabase
      .from('merv_permissions')
      .select('resource')
      .eq('owner_uid', sender_uid)
      .eq('allowed_uid', resolve.uid)
      .eq('assistant', 'chef')

    if (error || !data) {
      await sendMervMessage(receiver_uid, sender_uid, `❌ Could not fetch sharing history.`, 'vault_response', 'chef')
      return { status: 'error' }
    }

    const recipes = data
      .map((row: any) => row.resource?.replace('recipes.', ''))
      .filter(Boolean)

    const unique = [...new Set(recipes)]
    const list = unique.length
      ? unique.map((r) => `- ${r}`).join('\n')
      : '⚠️ You haven’t shared any recipes with them yet.'

    const response = unique.length
      ? `📜 You’ve shared the following recipes with ${name}:\n${list}`
      : list

    await sendMervMessage(receiver_uid, sender_uid, response, 'vault_response', 'chef')
    return { status: 'listed' }
  }

  // 📤 Share command — multi-format match
  const shareMatch = message.match(/(?:send|share)\s+(.+?)\s+(?:to|with)\s+(.+)/i)
    || message.match(/(?:send|share)\s+(\w+)\s+my\s+(.+)/i)

  if (shareMatch) {
    const [_, nameRaw, recipeRaw] = shareMatch
    const name = nameRaw?.trim()
    const recipeName = recipeRaw?.replace(/recipe/i, '').trim()

    console.log('👤 Parsed name:', name)
    console.log('📦 Parsed recipe name:', recipeName)

    if (!name || !recipeName) {
      await sendMervMessage(receiver_uid, sender_uid, '❌ Could not parse recipe or recipient.', 'vault_response', 'chef')
      return { status: 'error' }
    }

    const resolve = await resolveContactName(sender_uid, name)

    if (!resolve.success) {
      const fallback = resolve.reason === 'ambiguous'
        ? `🔍 You have multiple contacts named ${name}. Be more specific.`
        : `❌ Could not find anyone named ${name}.`

      await sendMervMessage(receiver_uid, sender_uid, fallback, 'vault_response', 'chef')
      return { status: 'error' }
    }

    console.log('✅ Sharing', recipeName, 'from', sender_uid, 'to', resolve.uid)

    const result = await shareRecipeWithUser({
      owner_uid: sender_uid,
      target_uid: resolve.uid,
      recipeQuery: recipeName
    })

    await sendMervMessage(receiver_uid, sender_uid, result.message, 'vault_response', 'chef')
    return { status: result.success ? 'shared' : 'error' }
  }

  // ❓ Fallback
  return { status: 'ignored' }
}