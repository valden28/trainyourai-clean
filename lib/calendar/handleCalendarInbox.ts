// lib/calendar/handleCalendarInbox.ts
export async function handleCalendarInbox({
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
    console.log('📅 Incoming calendar message:', message)
    return {
      status: 'ignored',
      note: 'Calendar inbox handler not yet implemented'
    }
  }