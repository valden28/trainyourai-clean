import { isAccessAllowed } from '@/lib/mervAccess/isAccessAllowed'
import { sendMervMessage } from '@/lib/mervLink/sendMessage'
import { getRecipeFromDb } from './db/getRecipeFromDb'
import { supabase } from '@/lib/supabaseServer'

export async function handleRecipeRequest({
  owner_uid,
  requester_uid,
  recipe
}: {
  owner_uid: string
  requester_uid: string
  recipe: string
}) {
  const resourceKey = `recipes.${recipe}`
  const access = await isAccessAllowed(owner_uid, requester_uid, 'chef', resourceKey)

  console.log(`🔍 Access level for ${requester_uid} → ${owner_uid} on ${resourceKey}:`, access)

  if (access === 'denied') {
    console.log('⛔ Access denied. No message sent.')
    return { status: 'denied' }
  }

  if (access === 'manual') {
    console.log('🟡 Manual access triggered')
    console.log('🔑 owner_uid:', owner_uid)
    console.log('🔑 requester_uid:', requester_uid)
    console.log('🔑 resource:', resourceKey)

    try {
      const { error } = await supabase.from('merv_approvals').insert({
        owner_uid,
        requester_uid,
        assistant: 'chef',
        resource: resourceKey,
        status: 'pending'
      })

      if (error) {
        console.error('❌ Approval insert failed:', error.message)
        return { status: 'error', error: error.message }
      }

      console.log('✅ Approval request inserted successfully')
      return { status: 'pending' }
    } catch (err: any) {
      console.error('❌ Insert crashed:', err.message)
      return { status: 'error', error: err.message }
    }
  }

  const match = await getRecipeFromDb(owner_uid, recipe)

  if (!match) {
    console.warn(`❌ Recipe not found in vault for ${owner_uid}:`, recipe)
    return { status: 'not_found' }
  }

  const recipeText = [
    `🍽️ ${match.title}`,
    '',
    '🧂 Ingredients:',
    ...match.ingredients.map((i: string) => `- ${i}`),
    '',
    '👨‍🍳 Instructions:',
    ...match.instructions.map((step: string, i: number) => `${i + 1}. ${step}`)
  ].join('\n')

  await sendMervMessage(
    owner_uid,
    requester_uid,
    recipeText,
    'recipe',
    'chef'
  )

  return { status: 'sent' }
}