// /app/api/save-vault/route.ts

import { createClient } from '@supabase/supabase-js';
import { auth } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const session = await auth(req);
  const userId = session?.user?.sub;

  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { vault } = body;

  const { error } = await supabase
    .from('vaults_test')
    .upsert({ user_uid: userId, ...vault }, { onConflict: 'user_uid' });

  if (error) return new Response('Error saving vault', { status: 500 });
  return new Response('OK');
}