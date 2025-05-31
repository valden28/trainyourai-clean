// /app/api/merv-messages/send/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { handleChefInbox } from '@/lib/chef/handleChefInbox'
import { handleCalendarInbox } from '@/lib/calendar/handleCalendarInbox'
import { handleMervIntent } from '@/lib/mervLink/handleMervIntent'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      sender_uid,
      receiver_uid,
      message,
      category = 'general',
      assistant = 'core',
      resource,
      recipe,
      share_target_uid
    } = body

    if (!sender_uid || !receiver_uid || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 🍽️ Route to Chef
    if (assistant === 'chef') {
      const result = await handleChefInbox({
        sender_uid,
        receiver_uid,
        message,
        category,
        resource,
        recipe,
        share_target_uid,
        assistant: 'chef'
      })
      return NextResponse.json({ handled: result })
    }

    // 📅 Route to Calendar
    if (assistant === 'calendar') {
      const result = await handleCalendarInbox({
        sender_uid,
        receiver_uid,
        message,
        category,
        assistant: 'calendar'
      })
      return NextResponse.json({ handled: result })
    }

    // 🤖 Default Merv handling
    const result = await handleMervIntent({
      sender_uid,
      receiver_uid,
      message,
      category,
      assistant
    })

    return NextResponse.json({ handled: result })
  } catch (err: any) {
    console.error('❌ Merv message error:', err)
    return NextResponse.json({ error: err.message || 'Unexpected server error' }, { status: 500 })
  }
}