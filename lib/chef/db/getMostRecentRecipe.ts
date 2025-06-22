// lib/chef/db/getMostRecentRecipe.ts
import { getSupabaseClient } from '@/utils/supabaseClient'
const supabase = getSupabaseClient();

interface MervMessage {
  message: string;
}

function isMervMessage(obj: any): obj is MervMessage {
  return obj && typeof obj.message === 'string';
}

export async function getMostRecentRecipe(user_uid: string) {
  const { data, error } = await supabase
    .from('merv_messages')
    .select('*')
    .eq('receiver_uid', user_uid)
    .eq('assistant', 'chef')
    .eq('category', 'recipe')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error || !data?.length) {
    console.error('❌ No recent recipe messages found:', error?.message);
    return null;
  }

  for (const msg of data) {
    if (!isMervMessage(msg)) continue;

    const lines = msg.message.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const title = lines[0].replace(/^📬\s*/, '').trim();
    const ingIndex = lines.findIndex((l) => l.toLowerCase().includes('ingredients'));
    const instrIndex = lines.findIndex((l) => l.toLowerCase().includes('instruction'));

    if (ingIndex === -1 || instrIndex === -1 || instrIndex <= ingIndex) continue;

    const ingredients = lines.slice(ingIndex + 1, instrIndex).filter(Boolean);
    const instructions = lines.slice(instrIndex + 1).filter(Boolean);

    if (ingredients.length && instructions.length && title) {
      return {
        key: title.toLowerCase().replace(/[^a-z0-9]/gi, ''),
        title,
        aliases: [],
        ingredients,
        instructions
      };
    }
  }

  console.warn('❌ Could not parse any valid recipe in recent messages.');
  return null;
}