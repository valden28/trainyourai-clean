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

  if (error || !data || !data.length) {
    console.error('❌ No valid recipe messages found:', error?.message);
    return null;
  }

  for (const msg of data) {
    if (!isMervMessage(msg)) continue;

    const lines = msg.message.split('\n');
    const hasIngredients = lines.some((l) => l.toLowerCase().includes('ingredients'));
    const hasInstructions = lines.some((l) => l.toLowerCase().includes('instruction'));
    const title = lines[0]?.replace('📬', '').trim();

    if (hasIngredients && hasInstructions && title) {
      const ingIndex = lines.findIndex((l) => l.toLowerCase().includes('ingredients'));
      const instrIndex = lines.findIndex((l) => l.toLowerCase().includes('instruction'));

      const ingredients = lines.slice(ingIndex + 1, instrIndex).filter(Boolean);
      const instructions = lines.slice(instrIndex + 1).filter(Boolean);

      if (ingredients.length && instructions.length) {
        return {
          key: title.toLowerCase().replace(/[^a-z0-9]/gi, ''),
          title,
          aliases: [],
          ingredients,
          instructions,
        };
      }
    }
  }

  console.error('❌ No parsable recipe found in recent messages.');
  return null;
}