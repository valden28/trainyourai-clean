// app/api/dashboard/owner/variance-top/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import { supabase } from '@/lib/supabaseServer';
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await getSession(req, NextResponse.next());
  if (!session?.user) return NextResponse.json({error:'unauthorized'},{status:401});
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const location = searchParams.get('location'); // location name

  const { data, error } = await supabase
    .from('v_owner_variance_top')
    .select('*')
    .eq('month', month)
    .eq('location', location)
    .lte('rnk', 20)
    .order('rnk', { ascending: true });

  if (error) return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ rows: data ?? [] });
}
