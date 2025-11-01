// ✅ File: app/api/vault/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import { supabase } from '@/lib/supabaseServer';

export const runtime = 'edge';

// Optional: minimal schema constraint for sanity
function isPlainObject(x: any) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

/**
 * POST body: the entire InnerView JSON (all sections you collected).
 * We shallow-merge it into vaults_test.data for the user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    if (!isPlainObject(payload)) {
      return NextResponse.json({ error: 'Invalid payload (must be JSON object)' }, { status: 400 });
    }

    // Get current vault (creates default row if missing)
    const { data: current, error: readErr } = await supabase
      .from('vaults_test')
      .select('user_uid, data')
      .eq('user_uid', user_uid)
      .single();

    if (readErr && readErr.code !== 'PGRST116') { // ignore "no rows" error
      return NextResponse.json({ error: `Read error: ${readErr.message}` }, { status: 500 });
    }

    const existingData = (current?.data && typeof current.data === 'object') ? current.data : {};
    // Shallow merge: payload wins; existing keys remain unless overwritten
    const merged = { ...existingData, ...payload };

    // Upsert
    const { error: upsertErr } = await supabase
      .from('vaults_test')
      .upsert(
        { user_uid, data: merged },
        { onConflict: 'user_uid' },
      );

    if (upsertErr) {
      return NextResponse.json({ error: `Upsert error: ${upsertErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
