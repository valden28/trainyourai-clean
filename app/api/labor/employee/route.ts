'use server';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const locationName = url.searchParams.get('location') || 'Banyan House';

    const { data: loc } = await supabase
      .from('locations').select('id').ilike('name', locationName).maybeSingle();
    if (!loc) return NextResponse.json({ rows: [] });

    const { data, error } = await supabase
      .from('v_schedule_variance_employee')
      .select('*')
      .eq('location_id', loc.id)
      .order('payroll_variance', { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ rows: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
