export const recipeVault: {
    [user_uid: string]: {
      [recipeKey: string]: {
        title: string
        aliases: string[]
        ingredients: string[]
        instructions: string[]
      }
    }
  } = {
    'auth0|680d2b50b77c3e848ec81f29': {
      risotto: {
        title: 'Risotto',
        aliases: [],
        ingredients: ['Arborio rice', 'chicken stock'],
        instructions: ['Stir for 20 min', 'Add cheese']
      },
      steakRub: {
        title: 'Steak Rub',
        aliases: [],
        ingredients: ['salt', 'pepper', 'garlic'],
        instructions: ['Rub into steak before cooking']
      }
    }
  }