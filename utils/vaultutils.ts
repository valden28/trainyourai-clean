// utils/vaultutils.ts
import { supabase } from '@/utils/supabaseClient';

export async function getVaultByUID(uid: string) {
  const { data, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', uid)
    .single();

  if (error) {
    console.error('Vault fetch error:', error.message);
    return null;
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