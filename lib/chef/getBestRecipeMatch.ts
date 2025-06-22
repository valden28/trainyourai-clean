// lib/chef/db/getBestRecipeMatch.ts
import { supabase } from '@/lib/supabaseServer';

export async function getBestRecipeMatch(
  user_uid: string,
  query: string
): Promise<{ key: string; data: any } | null> {
  const { data, error } = await supabase
    .from('recipes_vault')
    .select('*')
    .eq('user_uid', user_uid);

  if (error || !data) {
    console.error('❌ Vault lookup error:', error?.message);
    return null;
  }

  const normalize = (str: string) =>
    str?.toLowerCase().replace(/[^a-z0-9]/gi, '') || '';

  const input = normalize(query);

  const match = data.find((r: any) => {
    const key = normalize(r.key);
    const title = normalize(r.title);
    const aliases = Array.isArray(r.aliases)
      ? r.aliases.map(normalize)
      : [];

    return (
      key === input ||
      title === input ||
      key.includes(input) ||
      title.includes(input) ||
      aliases.some((alias: string) => alias.includes(input))
    );
  });

  if (!match || typeof match.key !== 'string') {
    console.warn(`❌ No recipe match found for query: "${query}"`);
    return null;
  }

  return {
    key: match.key.toLowerCase(),
    data: match
  };
}