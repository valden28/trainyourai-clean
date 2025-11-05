import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseServer'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenant_id, owner_uid, full_name, email, phone, location, tags, notes } = body
    if (!tenant_id || !owner_uid || !full_name) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('contacts')
      .upsert([{
        tenant_id, owner_uid, full_name, email, phone, location,
        tags: Array.isArray(tags) ? tags : null, notes
      }], { onConflict: 'tenant_id,owner_uid,full_name' })
      .select()
    if (error) throw error
    return NextResponse.json({ ok: true, rows: data })
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
