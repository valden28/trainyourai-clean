'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const locationName = url.searchParams.get('location') || 'Banyan House';

    // resolve location id
    const { data: loc, error: locErr } = await supabase
      .from('locations')
      .select('id,name')
      .ilike('name', locationName)
      .maybeSingle();
    if (locErr || !loc) return NextResponse.json({ rows: [] });

    // base query
    let q = supabase.from('v_schedule_variance_daily')
      .select('*')
      .eq('location_id', loc.id)
      .order('work_date', { ascending: false })
      .limit(60);

    if (from) q = q.gte('work_date', from);
    if (to)   q = q.lte('work_date', to);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ rows: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
