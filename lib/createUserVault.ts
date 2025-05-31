import { supabase } from '@/lib/supabaseServer'

export async function createUserVaultIfMissing(user_uid: string) {
  const { data, error } = await supabase
    .from('vaults_test')
    .select('user_uid')
    .eq('user_uid', user_uid)
    .maybeSingle()

  if (error) {
    console.error('❌ Vault lookup failed:', error.message)
    return
  }

  if (!data) {
    const { error: insertError } = await supabase
      .from('vaults_test')
      .insert({
        user_uid,
        // Optionally prefill fields like: auto_share: { recipes: false, calendar: false }
      })

    if (insertError) {
      console.error('❌ Vault insert failed:', insertError.message)
    } else {
      console.log(`✅ Vault created for ${user_uid}`)
    }
  } else {
    console.log(`ℹ️ Vault already exists for ${user_uid}`)
  }
}