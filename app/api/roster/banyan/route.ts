'use server';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export const runtime = 'edge';

export async function GET() {
  try {
    const { data: loc } = await supabase
      .from('locations').select('id').ilike('name','Banyan House').maybeSingle();
    if (!loc) return NextResponse.json({ rows: [] });

    const { data, error } = await supabase
      .from('employee_roles')
      .select(`
        employee_id,
        role_id,
        location_id,
        employees!inner(first_name,last_name,email,phone),
        roles!inner(name)
      `)
      .eq('location_id', loc.id)
      .order('employee_id', { ascending: true });

    if (error) throw error;

    // flatten to simple rows
    const rows = (data || []).map((r: any) => ({
      first_name: r.employees?.first_name,
      last_name:  r.employees?.last_name,
      email:      r.employees?.email,
      phone:      r.employees?.phone,
      role:       r.roles?.name
    }));

    return NextResponse.json({ rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
