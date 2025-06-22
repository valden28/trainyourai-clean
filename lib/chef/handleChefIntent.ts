import { sendMervMessage } from '@/lib/mervLink/sendMessage';
import { saveRecipeToDb } from './db/saveRecipeToDb';
import { getMostRecentRecipe } from './db/getMostRecentRecipe';
import { listRecipesFromDb } from './db/listRecipesFromDb';
import { shareRecipeWithUser } from './shareRecipeWithUser';
import { resolveContactName } from '@/lib/contacts/resolveContactName';
import { getSupabaseClient } from '@/utils/supabaseClient';

const supabase = getSupabaseClient();

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

  // 💾 Save most recent recipe to vault
  if (lower.startsWith('save this') && lower.includes('to my vault')) {
    const recent = await getMostRecentRecipe(sender_uid);

    if (
      !recent ||
      !recent.title ||
      !recent.key ||
      !recent.ingredients?.length ||
      !recent.instructions?.length
    ) {
      await sendMervMessage(
        receiver_uid,
        sender_uid,
        '❌ That recipe isn’t ready to be saved — missing title, key, or instructions.',
        'vault_response',
        'chef'
      );
      return { status: 'invalid' };
    }

    const saved = await saveRecipeToDb(sender_uid, recent);

    const response =
      saved === 'saved'
        ? `✅ “${recent.title}” has been saved to your vault.`
        : saved === 'duplicate'
        ? `⚠️ You’ve already saved “${recent.title}.”`
        : `❌ Failed to save recipe.`;

    await sendMervMessage(receiver_uid, sender_uid, response, 'vault_response', 'chef');
    return { status: saved };
  }

  // 📝 Save under custom name
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
  if (lower.includes('what') && lower.includes('recipes') && lower.includes('saved')) {
    const recipes = await listRecipesFromDb(sender_uid);

    const list = recipes.length
      ? recipes.map((r: any) => `- ${r.title}`).join('\n')
      : '❌ No saved recipes yet.';

    const response = recipes.length
      ? `📚 Your saved recipes:\n${list}`
      : list;

    await sendMervMessage(receiver_uid, sender_uid, response, 'vault_response', 'chef');
    return { status: 'listed', message: response };
  }

  // 📤 Share intent: "send lasagna to Dave"
  const shareMatch =
    message.match(/(?:send|share)\s+(.+?)\s+(?:to|with)\s+(.+)/i) ||
    message.match(/(?:send|share)\s+(\w+)\s+my\s+(.+)/i);

  if (shareMatch) {
    const [_, recipeRaw, nameRaw] = shareMatch;
    const name = nameRaw?.trim();
    const recipeName = recipeRaw?.replace(/recipe/i, '').trim();

    if (!name || !recipeName) {
      await sendMervMessage(receiver_uid, sender_uid, '❌ Could not parse recipe or recipient.', 'vault_response', 'chef');
      return { status: 'error' };
    }

    const resolve = await resolveContactName(sender_uid, name);

    if (!resolve.success || typeof resolve.uid !== 'string') {
      const fallback =
        resolve.reason === 'ambiguous'
          ? `🔍 Multiple contacts named ${name}. Be more specific.`
          : `❌ Could not find anyone named ${name}.`;

      await sendMervMessage(receiver_uid, sender_uid, fallback, 'vault_response', 'chef');
      return { status: 'error' };
    }

    const result = await shareRecipeWithUser({
      owner_uid: sender_uid,
      target_uid: resolve.uid,
      recipeQuery: recipeName
    });

    await sendMervMessage(receiver_uid, sender_uid, result.message, 'vault_response', 'chef');
    return { status: result.success ? 'shared' : 'error' };
  }

  // ❓ Unrecognized input
  return { status: 'ignored' };
}