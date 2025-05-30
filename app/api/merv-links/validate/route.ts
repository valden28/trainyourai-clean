import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('merv_links')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  }

  if (data.status !== 'pending') {
    return NextResponse.json({ error: 'Invite already used or revoked' }, { status: 410 })
  }

  return NextResponse.json({ invite: data })
}