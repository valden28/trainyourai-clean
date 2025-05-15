// app/api/save-vault/route.ts

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
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
    ...vault
  };

  const { error } = await supabase
    .from('vaults_test')
    .upsert({ user_uid: userId, ...safeVault }, { onConflict: 'user_uid' });

    if (error) {
      console.error('[VAULT SAVE ERROR]', JSON.stringify(error, null, 2));
      return new NextResponse(`Failed to save vault: ${JSON.stringify(error)}`, { status: 500 });
    }

  return new NextResponse('Vault saved', { status: 200 });
}