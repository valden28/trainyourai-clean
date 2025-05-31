// app/api/save-vault/route.ts
import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';
;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req, NextResponse.next());
    const user = session?.user;
    const userId = user?.sub;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { vault } = await req.json();

    const safeVault = {
      innerview: vault.innerview || {},
      tonesync: vault.tonesync || {},
      skillsync: vault.skillsync || {},
    };

    const { error } = await supabase
      .from('vaults_test')
      .upsert({ user_uid: userId, ...safeVault }, { onConflict: 'user_uid' });

    if (error) {
      console.error('[VAULT SAVE ERROR]', JSON.stringify(error, null, 2));
      return new NextResponse(`Failed to save vault: ${JSON.stringify(error)}`, { status: 500 });
    }

    return new NextResponse('Vault saved', { status: 200 });
  } catch (err) {
    console.error('[SAVE-VAULT ERROR]', err);
    return new NextResponse('Unexpected error in save-vault route', { status: 500 });
  }
}