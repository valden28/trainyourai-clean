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

    const lines = msg.message.split('\n').map(line => line.trim()).filter(Boolean);

    const titleLine = lines.find(line =>
      /^(?:\d+\.\s*)?[a-zA-Z].*?(meatballs|salmon|chicken|risotto|pasta|recipe|tacos|soup)/i.test(line)
    );
    const title = titleLine?.replace(/^#+\s*/, '').replace(/[*_`]/g, '').trim();

    const ingStart = lines.findIndex(line => line.toLowerCase().includes('ingredients'));
    const instrStart = lines.findIndex(line =>
      line.toLowerCase().includes('instructions') ||
      line.toLowerCase().includes('steps') ||
      line.toLowerCase().includes('directions')
    );

    if (ingStart === -1 || instrStart === -1 || !title) continue;

    const ingredients = lines.slice(ingStart + 1, instrStart).filter(line =>
      /^[-*\d.]/.test(line) || /^[a-zA-Z]/.test(line)
    );

    const instructions = lines.slice(instrStart + 1).filter(Boolean);

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

  console.error('❌ No parsable recipe found in recent messages.');
  return null;
}