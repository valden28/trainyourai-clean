// app/api/dashboard/owner/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import { supabase } from '@/lib/supabaseServer';
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSession(req, NextResponse.next());
  if (!session?.user) return NextResponse.json({error:'unauthorized'},{status:401});
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const locationId = searchParams.get('locationId');

  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .gte('day', month)
    .lt('day', `${month}::date + interval '1 month'`)
    .or(locationId ? `location_id.eq.${locationId}` : '');

  if (error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ rows: data ?? [] });
}
