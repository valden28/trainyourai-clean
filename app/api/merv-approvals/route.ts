import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')

  const { data, error } = await supabase
    .from('merv_approvals')
    .select('*')
    .eq('owner_uid', uid)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ approvals: data })
}