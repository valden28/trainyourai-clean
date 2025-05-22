// File: /utils/vaultSummary.ts

export function generateVaultSummary(vault: any): string {
    if (!vault) return '';
  
    const identity = vault.identity || vault.innerview || {};
    const name = identity.fullName || '';
    const nickname = identity.nickname || '';
    const location = identity.currentLocation || identity.location || identity.hometown || '';
  
    const people = vault.people?.map((p: any) => p.name).join(', ') || '';
    const diet = Array.isArray(vault.food?.diet) ? vault.food.diet.join(', ') : vault.food?.diet || '';
    const favorites = vault.food?.favorites || '';
    const cookingStyle = vault.food?.cookingStyle || '';
    const healthGoals = vault.health?.goals?.join(', ') || '';
    const values = vault.beliefs?.values?.join(', ') || '';
    const tone = vault.preferences?.tonePreferences?.join(', ') || '';
    const sports = vault.sports?.sportsList?.map((s: any) => s.team).join(', ') || '';
    const job = vault.work?.title || '';
    const employer = vault.work?.employer || '';
    const company = vault.work?.company || '';
    const familiarity = vault.familiarity_score || 0;
  
    const sections = [];
  
    if (name || nickname) {
      sections.push(`Name: ${name}${nickname ? ` (goes by ${nickname})` : ''}`);
    }
    if (location) sections.push(`Location: ${location}`);
    if (job || employer) sections.push(`Role: ${job}${employer ? ` at ${employer}` : ''}`);
    if (company) sections.push(`Affiliation: ${company}`);
    if (people) sections.push(`People in Life: ${people}`);
    if (favorites || diet || cookingStyle) {
      const foodDetails = [favorites && `likes ${favorites}`, diet && `often eats ${diet}`, cookingStyle && `cooks ${cookingStyle}`].filter(Boolean).join('; ');
      sections.push(`Food Preferences: ${foodDetails}`);
    }
    if (healthGoals) sections.push(`Health Goals: ${healthGoals}`);
    if (values) sections.push(`Core Values: ${values}`);
    if (tone) sections.push(`Tone Preferences: ${tone}`);
    if (sports) sections.push(`Follows Sports: ${sports}`);
    sections.push(`Familiarity Score: ${familiarity}`);
  
    return sections.join('\n');
  }