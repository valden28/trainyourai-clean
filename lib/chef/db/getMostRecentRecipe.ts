// ✅ File: /lib/chef/db/getMostRecentRecipe.ts
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

    const lines = msg.message.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0]?.replace(/^📬\s*/, '').trim() || 'Untitled';

    // 🧠 Flexible index detection
    const ingIndex = lines.findIndex(l =>
      /^(ingredients|what you'll need|what you need|you will need)/i.test(l)
    );
    const instrIndex = lines.findIndex(l =>
      /^(instructions|steps|directions|to make|method)/i.test(l)
    );

    if (ingIndex === -1 || instrIndex === -1 || instrIndex <= ingIndex) continue;

    const ingredients = lines.slice(ingIndex + 1, instrIndex).filter(Boolean);
    const instructions = lines.slice(instrIndex + 1).filter(Boolean);

    if (ingredients.length && instructions.length) {
      console.log('✅ Parsed recipe title:', title);
      return {
        key: title.toLowerCase().replace(/[^a-z0-9]/gi, ''),
        title,
        aliases: [],
        ingredients,
        instructions,
      };
    }
  }

  console.error('❌ No parsable recipe found in recent messages.');
  return null;
}