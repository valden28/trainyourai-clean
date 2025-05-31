import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const uid = searchParams.get('uid')

  if (!uid) {
    return NextResponse.json({ error: 'Missing uid' }, { status: 400 })
  }

  try {
    // Fetch auto-share settings
    const { data: vault } = await supabase
      .from('vaults_test')
      .select('auto_share')
      .eq('user_uid', uid)
      .maybeSingle()

    // Fetch permission records
    const { data: permissions } = await supabase
      .from('merv_permissions')
      .select('resource, allowed_uid')
      .eq('owner_uid', uid)
      .eq('assistant', 'chef')

    return NextResponse.json({
      autoShare: vault?.auto_share || { recipes: false, calendar: false },
      accessList: permissions || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}