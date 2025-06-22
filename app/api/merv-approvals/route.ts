import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/utils/supabaseClient';
const supabase = getSupabaseClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uidParam = searchParams.get('uid');

  // ✅ Explicit check before using in .eq()
  if (!uidParam || typeof uidParam !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid UID' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('merv_approvals')
    .select('*')
    .eq('owner_uid', uidParam) // ✅ Now definitely a string
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ approvals: data });
}