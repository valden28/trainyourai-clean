import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServerSupabaseClient()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session?.user?.id) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
  }

  const userUid = session.user.id

  const { data, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', userUid)
    .single()

  if (error) {
    console.error('[VaultFetchError]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vault: data })
}