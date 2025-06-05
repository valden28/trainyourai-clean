// utils/familiarity.ts

import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

const VAULT_FIELDS = [
  'identity',
  'people',
  'preferences',
  'skillsync',
  'work',
  'beliefs',
  'food',
  'health',
  'sports',
  'travel',
  'popculture',
  'dates'
];

export async function updateFamiliarityScore(userId: string) {
  try {
    const { data: vault, error: vaultError } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (vaultError || !vault) {
      console.error('[FAMILIARITY ERROR] Vault not found:', vaultError);
      return;
    }

    // Calculate vault completeness
    let completedSections = 0;
    for (const field of VAULT_FIELDS) {
      if (vault[field] && Object.keys(vault[field] || {}).length > 0) {
        completedSections++;
      }
    }

    // Calculate message count (adjust table name if needed)
    const { count: messageCount, error: messageError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_uid', userId);

    if (messageError) {
      console.error('[FAMILIARITY ERROR] Message count fetch failed:', messageError);
      return;
    }

    const vaultScore = completedSections * 2; // Max 26%
    const usageScore = Math.floor((messageCount || 0) / 25) * 2; // Max ~74% if high usage
    const totalScore = Math.min(100, vaultScore + usageScore);

    // Only update if it's different
    if (vault.familiarity_score !== totalScore) {
        const { error: updateError } = await supabase
          .from('vaults_test')
          .update({ familiarity_score: totalScore })
          .eq('user_uid', userId);

      if (updateError) {
        console.error('[FAMILIARITY ERROR] Failed to update score:', updateError);
      }
    }
  } catch (err) {
    console.error('[FAMILIARITY ERROR] Unexpected:', err);
  }
}