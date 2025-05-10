import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const {
      user_uid,
      religion,
      politics,
      values,
      openness,
      tone_preference
    } = await req.json();

    if (!user_uid) {
      return NextResponse.json({ error: 'Missing user_uid' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('vaults_test')
      .upsert({
        user_uid,
        religion,
        politics,
        values,
        openness,
        tone_preference
      }, {
        onConflict: 'user_uid'
      });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Failed to save worldview data' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}