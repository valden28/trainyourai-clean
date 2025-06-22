// lib/mervLink/handleMervThreadMessage.ts
import { sendToAssistant } from './sendToAssistant'
import { resolveContactName } from '@/lib/contacts/resolveContactName'

export async function handleMervThreadMessage({
  user_uid,
  message
}: {
  user_uid: string
  message: string
}) {
  const lower = message.toLowerCase()

  // 🍝 Request recipe from contact: "ask Dave for risotto"
  if (lower.startsWith('ask') && lower.includes('for')) {
    const [_, nameRaw, recipeRaw] = message.match(/ask (.+?) for (.+)/i) || []
    const name = nameRaw?.trim()
    const recipe = recipeRaw?.trim()

    if (!name || !recipe) {
      return { type: 'error', text: '❌ Could not parse name or request.' }
    }

    const resolve = await resolveContactName(user_uid, name)

    if (!resolve.success || typeof resolve.uid !== 'string') {
      return {
        type: 'error',
        text: resolve.reason === 'ambiguous'
          ? `🔍 Multiple contacts named ${name}. Be more specific.`
          : `❌ No contact found named ${name}.`
      }
    }

    await sendToAssistant({
      sender_uid: user_uid,
      receiver_uid: resolve.uid,
      message: `Can I get your ${recipe} recipe?`,
      assistant: 'chef',
      category: 'recipe_request',
      resource: `recipes.${recipe.toLowerCase().replace(/\s+/g, '')}`
    })

    return { type: 'success', text: `📨 Asking ${name} for their ${recipe} recipe...` }
  }

  // ⏰ Ask about calendar: "ask Dave if he’s free Tuesday"
  if (lower.startsWith('ask') && lower.includes('free')) {
    const [_, nameRaw, timeRaw] = message.match(/ask (.+?) if .* (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i) || []
    const name = nameRaw?.trim()
    const time = timeRaw?.trim()

    if (!name || !time) {
      return { type: 'error', text: '❌ Could not parse name or time.' }
    }

    const resolve = await resolveContactName(user_uid, name)

    if (!resolve.success || typeof resolve.uid !== 'string') {
      return {
        type: 'error',
        text: resolve.reason === 'ambiguous'
          ? `🔍 Multiple contacts named ${name}. Be more specific.`
          : `❌ No contact found named ${name}.`
      }
    }

    await sendToAssistant({
      sender_uid: user_uid,
      receiver_uid: resolve.uid,
      message: `Are you available on ${time}?`,
      assistant: 'core',
      category: 'calendar_request'
    })

    return { type: 'success', text: `📨 Asking ${name} if they’re free on ${time}...` }
  }

  return { type: 'fallback', text: '🤖 Merv handled this internally.' }
}