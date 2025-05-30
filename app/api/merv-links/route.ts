// POST /api/merv-links
import { NextRequest, NextResponse } from 'next/server'
import { sendMervMessage } from '@/lib/mervLink/sendMessage'

export async function POST(req: NextRequest) {
  const { sender_uid, receiver_uid, message, category, assistant } = await req.json()

  if (!sender_uid || !receiver_uid || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Step 1: Send original message
    const original = await sendMervMessage(
      sender_uid,
      receiver_uid,
      message,
      category || 'general',
      assistant || 'core'
    )

    // Step 2: Auto-reply logic
    const shouldAutoReply =
      assistant === 'core' &&
      sender_uid !== receiver_uid

    if (shouldAutoReply) {
      await sendMervMessage(
        receiver_uid, // now the responder is the receiver
        sender_uid,   // sending back to the original sender
        `This is Merv. I’ve received your message and will notify the user.`,
        'general',
        'core'
      )
    }

    return NextResponse.json({ success: true, result: original })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}