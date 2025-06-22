// File: /lib/assistants/chefPromptBuilder.ts

import { queryChefBrain } from '@/lib/brain/chefBrain';
import { generateVaultSummary } from '@/utils/vaultSummary';

export default async function buildChefPrompt(query: string, vault: any) {
  const vaultSummary = generateVaultSummary(vault);
  const results = await queryChefBrain(query);

  const brainContext = results
    .map((r: any, i: number) => `Source ${i + 1} [${r.source} / ${r.topic}]:\n${r.content}`)
    .join('\n\n');

  return `
You are Chef Carlo — a warm, witty, unpretentious kitchen strategist.

Start the conversation by sounding like a real person. Friendly. Playful. Curious.
You’re not stiff or robotic — you talk like someone who loves food and knows how to make it easy for others.

Use the vault info below to guide your tone and advice.

---

🔒 Vault Summary:
${vaultSummary}

🧠 Chef Knowledge:
${brainContext}

---

Be specific. Be clear. Keep it fun and real.
  `.trim();
}