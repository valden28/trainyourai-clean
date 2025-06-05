import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const { error } = await supabase
    .from('merv_links')
    .update({ status: 'revoked' })
    .eq('token', token)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}