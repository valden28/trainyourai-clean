import { supabase } from '@/lib/supabaseServer';

export async function createUserVaultIfMissing(user_uid: string) {
  if (!user_uid || typeof user_uid !== 'string') {
    console.error('❌ Invalid user_uid:', user_uid);
    return { status: 'invalid_user' };
  }

  const { data, error } = await supabase
    .from('vaults_test')
    .select('user_uid')
    .eq('user_uid', user_uid)
    .maybeSingle();

  if (error) {
    console.error('❌ Vault lookup failed:', error.message);
    return { status: 'error', error: error.message };
  }

  if (data) {
    console.log(`ℹ️ Vault already exists for ${user_uid}`);
    return { status: 'exists' };
  }

  const { error: insertError } = await supabase.from('vaults_test').insert({ user_uid });

  if (insertError) {
    console.error('❌ Failed to create vault for user:', insertError.message);
    return { status: 'insert_error', error: insertError.message };
  }

  console.log(`✅ Vault created for ${user_uid}`);
  return { status: 'created' };
}