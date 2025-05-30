import { NextRequest, NextResponse } from 'next/server'
import { sendMervMessage } from '@/lib/mervLink/sendMessage'
import { handleIncomingMervMessage } from '@/lib/mervLink/handleIncomingMervMessage'

export async function POST(req: NextRequest) {
  const {
    sender_uid,
    receiver_uid,
    message,
    category,
    assistant,
    resource
  } = await req.json()

  if (!sender_uid || !receiver_uid || !message || !category || !assistant) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    // Step 1: Save the message
    const result = await sendMervMessage(
      sender_uid,
      receiver_uid,
      message,
      category,
      assistant,
      resource
    )

    // Step 2: Immediately route the message if it's internal (simulates instant delivery)
    const routingResult = await handleIncomingMervMessage({
      sender_uid,
      receiver_uid,
      message,
      category,
      assistant,
      resource
    })

    return NextResponse.json({ success: true, saved: result, handled: routingResult })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}