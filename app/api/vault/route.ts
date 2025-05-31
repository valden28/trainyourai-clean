// File: /app/api/vault/route.ts (cleaned version — no invalid imports)

import { NextResponse } from 'next/server'
import { getSession } from '@auth0/nextjs-auth0'
import { supabase } from '@/lib/supabaseServer'
import { createUserVaultIfMissing } from '@/lib/vault/createUserVaultIfMissing'

export async function GET() {
  const session = await getSession()

  const uid = session?.user?.sub
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ✅ Ensure the vault exists
  await createUserVaultIfMissing(uid)

  // ✅ Fetch the vault safely without `.single()`
  const { data, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', uid)
    .limit(1)

  if (error || !data?.length) {
    return NextResponse.json({ error: 'Vault not found or fetch error' }, { status: 500 })
  }

  return NextResponse.json(data[0])
}