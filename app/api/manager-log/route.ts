// ✅ File: app/api/manager-log/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Expected body (you can adjust later):
    // {
    //   "store_name": "Banyan House",
    //   "manager": "John Doe",
    //   "log_date": "2025-11-02",
    //   "subject": "End of Night Log",
    //   "notes": "Narrative text from 7Shifts email body"
    // }

    const { store_name, manager, log_date, subject, notes } = body;

    const { data: location } = await supabase
      .from('locations')
      .select('id')
      .ilike('name', store_name)
      .single();

    const { error } = await supabase.from('manager_logs').insert({
      tenant_id: (await supabase.from('tenants').select('id').limit(1)).data?.[0]?.id,
      location_id: location?.id,
      log_date,
      manager,
      subject,
      notes,
      source: '7shifts-email'
    });

    if (error) throw error;

    return NextResponse.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Manager Log error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
