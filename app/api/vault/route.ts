// File: /app/api/vault/route.ts (cleaned version — no invalid imports)

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req, NextResponse.next());
    const userId = session?.user?.sub;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: vault, error } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (error || !vault) {
      console.error('[VAULT FETCH ERROR]', error);
      return new NextResponse('Vault not found', { status: 404 });
    }

    return NextResponse.json(vault);
  } catch (err) {
    console.error('[VAULT ROUTE ERROR]', err);
    return new NextResponse('Unexpected error in vault route', { status: 500 });
  }
}