// utils/familiarity.ts
import { getSupabaseClient } from '@/utils/supabaseClient';

export async function updateFamiliarityScore(uid: string) {
  const supabase = getSupabaseClient();

  const { data: vault } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', uid)
    .single();

  if (!vault) return;

  const fields = [
    'innerview',
    'tonesync',
    'skillsync',
    'people',
    'dates',
    'preferences',
    'beliefs',
    'work',
    'food',
    'physical',
    'popculture',
    'health',
    'sports',
    'travel'
  ];

  let filled = 0;
  fields.forEach((key) => {
    if (vault[key] && Object.keys(vault[key]).length > 0) {
      filled++;
    }
  });

  const score = Math.round((filled / fields.length) * 100);

  await supabase
    .from('vaults_test')
    .update({ familiarity_score: score })
    .eq('user_uid', uid);
}