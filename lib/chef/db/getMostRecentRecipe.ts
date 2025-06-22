// lib/chef/db/getMostRecentRecipe.ts
import { getSupabaseClient } from '@/utils/supabaseClient';
const supabase = getSupabaseClient();

export async function getMostRecentRecipe(user_uid: string) {
  const { data, error } = await supabase
    .from('merv_messages')
    .select('*')
    .eq('receiver_uid', user_uid)
    .eq('assistant', 'chef')
    .eq('category', 'recipe')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error || !data || !data.length) {
    console.error('❌ No recent recipe messages found:', error?.message);
    return null;
  }

  const valid = data.find((msg: any) =>
    typeof msg.message === 'string' &&
    msg.message.includes('🧂') &&
    msg.message.includes('👨‍🍳')
  );

  if (!valid || typeof valid.message !== 'string') {
    console.warn('❌ No valid recipe message structure detected');
    return null;
  }

  const lines = valid.message.split('\n');
  const titleLine = lines.find((line: string) => line.startsWith('📬')) || lines[0];
  const title = titleLine?.replace('📬', '').trim() || 'Untitled';

  const ingIndex = lines.findIndex((l: string) => l.includes('🧂'));
  const instrIndex = lines.findIndex((l: string) => l.includes('👨‍🍳'));

  const ingredients = lines.slice(ingIndex + 1, instrIndex).filter(Boolean);
  const instructions = lines.slice(instrIndex + 1).filter(Boolean);

  return {
    key: title.toLowerCase().replace(/\s+/g, ''),
    title,
    aliases: [],
    ingredients,
    instructions,
  };
}