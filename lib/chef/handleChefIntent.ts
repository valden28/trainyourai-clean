// ✅ File: /lib/chef/handleChefIntent.ts

import { supabase } from '@/lib/supabaseServer';
import { sendMervMessage } from '@/lib/mervLink/sendMessage';
import { saveRecipeToDb } from './db/saveRecipeToDb';
import { listRecipesFromDb } from './db/listRecipesFromDb';
import { resolveContactName } from '@/lib/contacts/resolveContactName';
import { shareRecipeWithUser } from './shareRecipeWithUser';

export async function handleChefIntent({
  sender_uid,
  receiver_uid,
  message
}: {
  sender_uid: string;
  receiver_uid: string;
  message: string;
}) {
  console.log('🧠 Incoming chef intent message:', message);
  const lower = message.toLowerCase().trim();

  // 💾 Save most recent pending recipe to vault
  if (
    /save .*to (my )?vault/.test(lower) ||
    /store .*in (my )?vault/.test(lower) ||
    lower.includes('save that') ||
    lower.includes('save it to my vault')
  ) {
    const { data, error } = await supabase
      .from('pending_recipes')
      .select('id, content')
      .eq('user_uid', sender_uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.content) {
      console.error('❌ Failed to fetch pending recipe:', error?.message);
      await sendMervMessage(
        receiver_uid,
        sender_uid,
        '❌ Sorry, I couldn’t find anything recent to save.',
        'vault_response',
        'chef'
      );
      return { status: 'invalid' };
    }

    const lines = data.content.split('\n').map(l => l.trim());
    const title = lines[0]?.replace(/^📬/, '').trim();

    const ingIndex = lines.findIndex((l) => l.toLowerCase().includes('ingredients'));
    const instrIndex = lines.findIndex((l) => l.toLowerCase().includes('instruction'));

    if (ingIndex === -1 || instrIndex === -1 || instrIndex <= ingIndex) {
      console.error('❌ Could not parse ingredients/instructions block.');
      await sendMervMessage(
        receiver_uid,
        sender_uid,
        '❌ That recipe isn’t formatted correctly — missing ingredients or instructions.',
        'vault_response',
        'chef'
      );
      return { status: 'invalid' };
    }

    const ingredients = lines.slice(ingIndex + 1, instrIndex).filter(Boolean);
    const instructions = lines.slice(instrIndex + 1).filter(Boolean);

    if (!title || !ingredients.length || !instructions.length) {
      await sendMervMessage(
        receiver_uid,
        sender_uid,
        '❌ That recipe is missing required info — title, ingredients, or steps.',
        'vault_response',
        'chef'
      );
      return { status: 'invalid' };
    }

    const result = await saveRecipeToDb(sender_uid, {
      key: title.toLowerCase().replace(/[^a-z0-9]/gi, ''),
      title,
      aliases: [],
      ingredients,
      instructions
    });

    const response =
      result === 'saved'
        ? `✅ “${title}” has been saved to your vault.`
        : result === 'duplicate'
        ? `⚠️ You’ve already saved “${title}.”`
        : `❌ Failed to save recipe.`;

    await sendMervMessage(receiver_uid, sender_uid, response, 'vault_response', 'chef');
    return { status: result, message: response };
  }

  // 📝 Save custom title
  if (lower.startsWith('save this as')) {
    const title = message.replace(/^save this as/i, '').trim();
    const key = title.toLowerCase().replace(/\s+/g, '');

    if (!title || title.length < 3) {
      await sendMervMessage(
        receiver_uid,
        sender_uid,
        '❌ Please provide a valid title for the recipe.',
        'vault_response',
        'chef'
      );
      return { status: 'invalid_title' };
    }

    const result = await saveRecipeToDb(sender_uid, {
      key,
      title,
      aliases: [],
      ingredients: ['[user-defined]'],
      instructions: ['[user-defined]']
    });

    const msg =
      result === 'saved'
        ? `✅ Saved “${title}” to your vault.`
        : result === 'duplicate'
        ? `⚠️ You’ve already saved “${title}.”`
        : `❌ Something went wrong while saving.`;

    await sendMervMessage(receiver_uid, sender_uid, msg, 'vault_response', 'chef');
    return { status: result };
  }

  // 📚 List saved recipes
  if (
    lower.includes('recipes') &&
    (lower.includes('saved') ||
      lower.includes('what') ||
      lower.includes('show') ||
      lower.includes('in my vault') ||
      lower.includes('my recipes') ||
      lower.includes('list'))
  ) {
    const recipes = await listRecipesFromDb(sender_uid);
    console.log('📦 Vault contents returned from DB:', recipes);

    const list = recipes.length
      ? recipes.map((r: any) => `- ${r.title}`).join('\n')
      : '❌ No saved recipes yet.';

    const response = recipes.length
      ? `📚 Your saved recipes:\n${list}`
      : list;

    await sendMervMessage(receiver_uid, sender_uid, response, 'vault_response', 'chef');
    return { status: 'listed', message: response };
  }

  // 🔄 Share intent (reserved)
  return { status: 'ignored' };
}