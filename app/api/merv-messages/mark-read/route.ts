import { NextRequest, NextResponse } from 'next/server'
import { markMessageRead } from '@/lib/mervLink/markMessageRead'

export async function POST(req: NextRequest) {
  const { message_id } = await req.json()

  if (!message_id) {
    return NextResponse.json({ error: 'Missing message_id' }, { status: 400 })
  }

  try {
    await markMessageRead(message_id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}