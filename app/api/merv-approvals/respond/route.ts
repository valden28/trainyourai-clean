import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();
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

  const result = await sendMervMessage(
    data.owner_uid,
    data.requester_uid,
    responseMessage,
    'food',
    'chef'
  )

  console.log('✅ Approval response message sent:', result)

  return NextResponse.json({ success: true, message: result })
}