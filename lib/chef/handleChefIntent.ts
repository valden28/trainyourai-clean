if (lower.includes('what') && lower.includes('recipes') && lower.includes('saved')) {
  const recipes = await listRecipesFromDb(sender_uid);

  const list = recipes.length
    ? recipes.map((r: any) => `- ${r.title}`).join('\n')
    : '❌ No saved recipes yet.';

  const response = recipes.length
    ? `📚 Your saved recipes:\n${list}`
    : list;

  await sendMervMessage(receiver_uid, sender_uid, response, 'vault_response', 'chef');

  return {
    status: 'listed',
    message: response
  };
}