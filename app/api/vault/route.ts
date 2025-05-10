import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@auth0/nextjs-auth0'

export async function GET(req: NextRequest) {
  const session = await getSession(req)

  if (!session?.user) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
  }

  const userUid = session.user.sub // your Auth0 UUID

  const { data, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', userUid)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ vault: data })
}