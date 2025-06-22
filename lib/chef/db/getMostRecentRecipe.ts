// ✅ File: /lib/chef/db/getMostRecentRecipe.ts
import { getSupabaseClient } from '@/utils/supabaseClient';
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

    let title = '';
    let ingredients: string[] = [];
    let instructions: string[] = [];

    let section: 'none' | 'ingredients' | 'instructions' = 'none';

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (lower.includes('ingredients')) {
        section = 'ingredients';
        continue;
      }

      if (lower.includes('instructions') || lower.includes('steps')) {
        section = 'instructions';
        continue;
      }

      if (section === 'ingredients') {
        ingredients.push(line);
      } else if (section === 'instructions') {
        instructions.push(line);
      } else if (!title && line.length < 100 && /^[a-zA-Z0-9\s\-,'()]+$/.test(line)) {
        title = line;
      }
    }

    if (title && ingredients.length && instructions.length) {
      return {
        key: title.toLowerCase().replace(/[^a-z0-9]/gi, ''),
        title,
        aliases: [],
        ingredients,
        instructions
      };
    }
  }

  console.error('❌ No parsable recipe found in recent messages.');
  return null;
}