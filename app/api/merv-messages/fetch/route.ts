import { NextRequest, NextResponse } from 'next/server'
import { getMervMessages } from '@/lib/mervLink/getMessages'
import { markMessageRead } from '@/lib/mervLink/markMessageRead'
import { handleIncomingMervMessage } from '@/lib/mervLink/handleIncomingMervMessage'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')

  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
  }

  try {
    const messages = await getMervMessages(uid, 'unread')
    const results = []

    for (const msg of messages) {
      const result = await handleIncomingMervMessage(msg)
      await markMessageRead(msg.id)
      results.push({ message: msg, result })
    }

    return NextResponse.json({ handled: results })
} catch (err: any) {
    console.error('❌ /api/merv-messages/fetch crashed:', err)
    return NextResponse.json({ error: err.message || 'Unknown server error' }, { status: 500 })
  }