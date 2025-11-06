// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import { supabase } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await getSession(req, NextResponse.next());
  const user_uid = session?.user?.sub;
  if (!user_uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { query, sources, limit, tenant_id } = await req.json().catch(() => ({}));
  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('rpc_search_all', {
    p_tenant: tenant_id ?? null,
    p_query: query,
    p_sources: Array.isArray(sources) && sources.length ? sources : null,
    p_limit: Math.min(Number(limit || 25), 100),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}
