// app/api/save-section/route.ts
import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
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

    await updateFamiliarityScore(userId);

    return new NextResponse(`Saved ${field}`, { status: 200 });
  } catch (err) {
    console.error('[SAVE-SECTION ERROR]', err);
    return new NextResponse('Unexpected error in save-section route', { status: 500 });
  }
}