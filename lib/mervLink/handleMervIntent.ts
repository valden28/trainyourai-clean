// lib/mervLink/handleMervIntent.ts
export async function handleMervIntent({
    sender_uid,
    receiver_uid,
    message,
    category,
    assistant
  }: {
    sender_uid: string
    receiver_uid: string
    message: string
    category: string
    assistant: string
  }) {
    console.log('🧠 Default Merv handler received message:', message)
    return {
      status: 'ignored',
      note: 'No custom handler for this assistant type yet.'
    }
  }