import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function updateFamiliarityScore(uid: string) {
  const { data: vault } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', uid)
    .single();

  if (!vault) return;

  let score = 0;

  // Section completions
  if (vault.innerview) score += 10;
  if (vault.people) score += 10;
  if (vault.work) score += 10;
  if (vault.beliefs) score += 10;
  if (vault.preferences) score += 5;
  if (vault.food) score += 5;
  if (vault.health) score += 5;
  if (vault.popculture) score += 5;

  // Personalization
  if (vault.tonesync) score += 10;
  if (vault.skillsync) score += 10;

  // Chat activity (optional — if tracked)
  if (vault.total_messages) {
    score += Math.floor(vault.total_messages / 10);
    score += Math.floor(vault.total_messages / 100) * 5;
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Update
  await supabase
    .from('vaults_test')
    .update({ familiarity_score: score })
    .eq('user_uid', uid);
}