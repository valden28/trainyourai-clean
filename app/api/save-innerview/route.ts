// app/api/save-innerview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { uid, innerview } = await req.json();

    const { error } = await supabase
      .from('vaults_test')
      .update({ innerview })
      .eq('user_uid', uid);

    if (error) {
      console.error('[INNERVIEW SAVE ERROR]', error);
      return new NextResponse('Error saving innerview', { status: 500 });
    }

    return new NextResponse('Innerview saved', { status: 200 });
  } catch (err) {
    console.error('[SAVE-INNERVIEW ROUTE ERROR]', err);
    return new NextResponse('Unexpected error', { status: 500 });
  }
}