// utils/vaultutils.ts
import { getSupabaseClient } from '@/utils/supabaseClient';

export async function createVaultIfMissing(uid: string) {
  const supabase = getSupabaseClient();

  // Check if vault exists
  const { data, error } = await supabase
    .from('vaults_test')
    .select('user_uid')
    .eq('user_uid', uid)
    .single();

  // If not found and no error, create it
  if (!data && !error) {
    await supabase.from('vaults_test').insert([{ user_uid: uid }]);
  }

  return data;
}

export async function createVaultIfMissing(uid: string) {
  const { data, error } = await supabase
    .from('vaults_test')
    .select('user_uid')
    .eq('user_uid', uid)
    .single();

  if (!data && !error) {
    await supabase.from('vaults_test').insert([{ user_uid: uid }]);
  }
}