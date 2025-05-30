// lib/mervLink/sendToAssistant.ts

export async function sendToAssistant(input: {
    sender_uid: string,
    receiver_uid: string,
    message: string,
    assistant?: string,
    category?: string,
    resource?: string,
    recipe?: any,
    share_target_uid?: string
  }) {
    const res = await fetch('/api/merv-messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })
  
    const data = await res.json()
  
    if (!res.ok) throw new Error(data.error || 'Unknown error')
  
    return data
  }