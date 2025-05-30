import { handleRecipeRequest } from './handleRecipeRequest'
import { saveRecipeToDb } from './db/saveRecipeToDb'
import { shareRecipeWithUser } from './shareRecipeWithUser'
import { sendMervMessage } from '@/lib/mervLink/sendMessage'
import { handleChefIntent } from './handleChefIntent'

export async function handleChefInbox(message: {
  sender_uid: string
  receiver_uid: string
  assistant: string
  category: string
  message: string
  resource?: string
  recipe?: any
  share_target_uid?: string
}) {
  const {
    sender_uid,
    receiver_uid,
    category,
    resource,
    recipe,
    share_target_uid,
    message: content
  } = message

  // 🍽️ Handle recipe request
  if (category === 'recipe_request' && resource?.startsWith('recipes.')) {
    const recipeName = resource.replace('recipes.', '')
    return await handleRecipeRequest({
      owner_uid: receiver_uid,
      requester_uid: sender_uid,
      recipe: recipeName
    })
  }

  // 📝 Handle saving a new recipe
  if (category === 'recipe_save' && recipe) {
    const saved = await saveRecipeToDb(receiver_uid, recipe)

    const response = saved
      ? `✅ Saved “${recipe.title}” to your vault.`
      : `❌ Failed to save recipe. Please check for missing fields.`

    await sendMervMessage(
      receiver_uid,
      sender_uid,
      response,
      'vault_response',
      'chef'
    )

    return { status: saved ? 'saved' : 'error' }
  }

  // 📤 Handle sharing a recipe with another user
  if (category === 'recipe_share' && resource && share_target_uid) {
    const recipeName = resource.replace('recipes.', '')
    const result = await shareRecipeWithUser({
      owner_uid: receiver_uid,
      target_uid: share_target_uid,
      recipeQuery: recipeName
    })

    await sendMervMessage(
      receiver_uid,
      sender_uid,
      result.message,
      'vault_response',
      'chef'
    )

    return { status: result.success ? 'shared' : 'error' }
  }

  /// 🧠 Fallback to natural intent handler
console.log('🧾 Intent sender:', sender_uid)
console.log('🧾 Intent receiver:', receiver_uid)

return await handleChefIntent({
  sender_uid,
  receiver_uid,
  message: content
})