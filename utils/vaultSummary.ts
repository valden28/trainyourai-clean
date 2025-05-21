// utils/vaultSummary.ts

export function generateVaultSummary(vault: any): string {
    if (!vault) return '';
  
    const name = vault.identity?.fullName || 'the user';
    const nickname = vault.identity?.nickname || '';
    const location = vault.identity?.currentLocation || vault.identity?.hometown || '';
    const values = vault.beliefs?.values?.join(', ') || '';
    const tone = vault.preferences?.tonePreferences?.join(', ') || '';
    const people = vault.people?.map((p: any) => p.name).join(', ') || '';
    const food = vault.food?.favorites || '';
    const diet = vault.food?.diet?.join(', ') || '';
    const sports = vault.sports?.sportsList?.map((s: any) => s.team).join(', ') || '';
    const familiarity = vault.familiarityScore || 0;
  
    return `
  - Name: ${name}${nickname ? ` (goes by ${nickname})` : ''}
  - Location: ${location}
  - People: ${people}
  - Favorite Food: ${food}
  - Diet Style: ${diet}
  - Tone Preferences: ${tone}
  - Core Values: ${values}
  - Sports Teams: ${sports}
  - Familiarity Score: ${familiarity}
    `.trim();
  }