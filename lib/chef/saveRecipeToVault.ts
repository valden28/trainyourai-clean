import { recipeVault } from '@/lib/vault/vault.recipes'

// 🔧 This will mutate the vault in-memory (for dev/testing only)
export function saveRecipeToVault(user_uid: string, recipe: {
  key: string
  title: string
  aliases?: string[]
  ingredients: string[]
  instructions: string[]
}): boolean {
  if (!user_uid || !recipe.key || !recipe.ingredients || !recipe.instructions) {
    return false
  }

  if (!recipeVault[user_uid]) {
    recipeVault[user_uid] = {}
  }

  recipeVault[user_uid][recipe.key.toLowerCase()] = {
    title: recipe.title,
    aliases: recipe.aliases || [],
    ingredients: recipe.ingredients,
    instructions: recipe.instructions
  }

  return true
}