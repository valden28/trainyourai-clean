// utils/vaultSummary.ts

export function generateVaultSummary(vault: any): string {
    if (!vault) return '';
  
    const identity = vault.identity || vault.innerview || {};
    const name = identity.fullName || 'User';
    const nickname = identity.nickname || '';
    const location =
      identity.currentLocation ||
      identity.location ||
      identity.hometown ||
      '';
  
    const values = vault.beliefs?.values?.join(', ') || '';
    const tone = vault.preferences?.tonePreferences?.join(', ') || '';
    const people = vault.people?.map((p: any) => p.name).join(', ') || '';
    const food = vault.food?.favorites || '';
    const diet =
      Array.isArray(vault.food?.diet)
        ? vault.food?.diet.join('')
        : vault.food?.diet || '';
    const sports =
      vault.sports?.sportsList?.map((s: any) => s.team).join(', ') || '';
    const familiarity = vault.familiarity_score || 0;
  
    return `
  - Name: ${name}${nickname ? ` (goes by ${nickname})` : ''}
  - Location: ${location}
  - Work: ${vault.work?.title || ''}${vault.work?.employer ? ` at ${vault.work.employer}` : ''}
  - People: ${people}
  - Favorite Food: ${food}
  - Diet Style: ${diet}
  - Tone Preferences: ${tone}
  - Core Values: ${values}
  - Sports Teams: ${sports}
  - Familiarity Score: ${familiarity}
    `.trim();
  }