// File: /app/api/merv-approvals/respond/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/utils/supabaseClient';
const supabase = getSupabaseClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUid = searchParams.get('uid');

  // Type narrowing to guarantee string type
  if (!rawUid || typeof rawUid !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid UID' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('merv_approvals')
    .select('*')
    .eq('owner_uid', rawUid)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ approvals: data });
}