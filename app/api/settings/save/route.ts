import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  const { uid, autoShare } = await req.json()

  if (!uid || !autoShare) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error } = await supabase.from('vault_settings').upsert({
    user_uid: uid,
    auto_share: autoShare
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}