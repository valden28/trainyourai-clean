import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'
import { sendMervMessage } from '@/lib/mervLink/sendMessage'

export async function POST(req: NextRequest) {
  const { id, action } = await req.json()

  if (!id || !['approve', 'deny'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }

  // Update approval status
  const { data, error } = await supabase
    .from('merv_approvals')
    .update({
      status: action === 'approve' ? 'approved' : 'denied',
      responded_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Approval not found or failed to update' }, { status: 500 })
  }

  const recipeName = data.resource.replace('recipes.', '')

  // Send back a message to requester
  const responseMessage =
    action === 'approve'
      ? `✅ Approved: ${recipeName} is now available.`
      : `❌ Request for ${recipeName} was denied.`

  const messageResult = await sendMervMessage(
    data.owner_uid,      // from Dave
    data.requester_uid,  // to Den
    responseMessage,
    'recipe',
    'chef'
  )

  return NextResponse.json({ success: true, message: messageResult })
}