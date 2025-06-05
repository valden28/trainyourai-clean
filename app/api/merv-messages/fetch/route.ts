import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('merv_messages')
      .select('*')
      .or(`sender_uid.eq.${uid},receiver_uid.eq.${uid}`)
      .order('timestamp', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data });
  } catch (err: any) {
    console.error('❌ /api/merv-messages/fetch crashed:', err);
    return NextResponse.json(
      { error: err.message || 'Unknown server error' },
      { status: 500 }
    );
  }
}