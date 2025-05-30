import { handleChefInbox } from '@/lib/chef/handleChefInbox'

export async function handleIncomingMervMessage(message: {
  sender_uid: string
  receiver_uid: string
  assistant: string
  category: string
  message: string
  resource?: string
}) {
  if (message.assistant === 'chef') {
    return await handleChefInbox(message)
  }

  // Add other assistant types here (e.g. 'travel', 'calendar')
  return { status: 'ignored', reason: 'no handler found' }
}