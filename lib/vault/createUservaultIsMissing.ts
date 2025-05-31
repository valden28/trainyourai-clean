import { supabase } from '@/lib/supabaseServer'

export async function createUserVaultIfMissing(user_uid: string) {
  const { data, error } = await supabase
    .from('vaults_test')
    .select('user_uid')
    .eq('user_uid', user_uid)
    .maybeSingle()

  if (!data) {
    const { error: insertError } = await supabase
      .from('vaults_test')
      .insert({ user_uid })

    if (insertError) {
      console.error('❌ Failed to create vault for user:', insertError.message)
    } else {
      console.log(`✅ Vault created for ${user_uid}`)
    }
  }
}