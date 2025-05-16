// app/api/save-innerview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    const { uid, innerview } = await req.json();
  
    console.log('[SAVE INNERVIEW]', { uid, innerview });
  
    const { error } = await supabase
      .from('vaults_test')
      .update({ innerview })
      .eq('user_uid', uid);
  
    if (error) {
      console.error('[INNERVIEW SAVE ERROR]', error);
      return NextResponse.json({ success: false }, { status: 500 });
    }
  
    return NextResponse.json({ success: true });
  }