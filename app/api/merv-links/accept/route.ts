import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

export async function POST(req: NextRequest) {
  const { token, linked_uid } = await req.json()

  if (!token || !linked_uid) {
    return NextResponse.json({ error: 'Missing token or user ID' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('merv_links')
    .update({
      linked_uid,
      status: 'active'
    })
    .eq('token', token)
    .eq('status', 'pending')
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 })
  }

  return NextResponse.json({ success: true, link: data })
}