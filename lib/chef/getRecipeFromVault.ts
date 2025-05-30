import { recipeVault } from '@/lib/vault/vault.recipes'

export function getRecipeFromVault(user_uid: string, recipe: string): string | null {
  const userRecipes = recipeVault[user_uid]
  if (!userRecipes || !userRecipes[recipe]) return null

  const r = userRecipes[recipe]
  return [
    `🍽️ ${r.title}`,
    '',
    '🧂 Ingredients:',
    ...r.ingredients.map(i => `- ${i}`),
    '',
    '👨‍🍳 Instructions:',
    ...r.instructions.map((step, i) => `${i + 1}. ${step}`)
  ].join('\n')
}