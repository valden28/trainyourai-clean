// app/api/vault/route.ts
import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('vaults_test')
    .select('*')
    .limit(1)

  if (error) {
    console.error('[VaultFetchError]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vault: data })
}