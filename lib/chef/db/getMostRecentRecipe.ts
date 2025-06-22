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
    const titleLine = lines[0] || '';
    const title = titleLine.replace(/^📬\s?/, '').trim();

    const ingIndex = lines.findIndex(l =>
      /🧂|ingredients[:]?/i.test(l)
    );
    const instrIndex = lines.findIndex(l =>
      /👨‍🍳|instructions[:]?/i.test(l)
    );

    const ingredients = ingIndex >= 0 && instrIndex > ingIndex
      ? lines.slice(ingIndex + 1, instrIndex)
      : [];

    const instructions = instrIndex >= 0
      ? lines.slice(instrIndex + 1)
      : [];

    if (title && ingredients.length && instructions.length) {
      console.log('✅ Parsed recipe from recent messages:', { title, ingredients, instructions });
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