// app/api/dashboard/owner/kpis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import { supabase } from '@/lib/supabaseServer';
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSession(req, NextResponse.next());
  if (!session?.user) return NextResponse.json({error:'unauthorized'},{status:401});
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');   // e.g. 2025-11-01
  const locationId = searchParams.get('locationId'); // optional

  let q = supabase.from('v_owner_kpis').select('*').eq('month', month);
  if (locationId) q = q.eq('location_id', locationId);
  const { data, error } = await q;
  if (error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ rows: data ?? [] });
}
