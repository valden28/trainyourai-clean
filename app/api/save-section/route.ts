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

  const { searchParams } = new URL(req.url);
  const field = searchParams.get('field');
  const { data } = await req.json();

  if (!field || typeof field !== 'string') {
    return new NextResponse('Missing or invalid field parameter', { status: 400 });
  }

  const { error } = await supabase
    .from('vaults_test')
    .upsert(
      { user_uid: userId, [field]: data },
      { onConflict: 'user_uid' }
    );

  if (error) {
    console.error(`[VAULT SAVE ERROR - ${field}]`, error);
    return new NextResponse(`Failed to save ${field}: ${error.message}`, { status: 500 });
  }

  return new NextResponse(`Saved ${field}`, { status: 200 });
}