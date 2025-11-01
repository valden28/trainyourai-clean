import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const out: any = { ok: true, checks: {} };
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    new URL(url); // will throw if malformed
    const supabase = createClient(url, service);
    const { data, error } = await supabase.from('vaults_test').select('id').limit(1);
    if (error) throw error;
    out.checks.supabase = 'ok';
  } catch (e: any) {
    out.ok = false; out.checks.supabase = `fail: ${e.message}`;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    await openai.models.list();
    out.checks.openai = 'ok';
  } catch (e: any) {
    out.ok = false; out.checks.openai = `fail: ${e.message}`;
  }

  return NextResponse.json(out, { status: out.ok ? 200 : 500 });
}
