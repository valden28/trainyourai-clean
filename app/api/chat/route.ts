// File: /api/chat/route.ts (patched keyword logic and tone check)

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { generateVaultSummary } from '@/utils/vaultSummary';
import { assistants } from '@/assistants';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function detectAssistant(userMessage: string): keyof typeof assistants | null {
  const lower = userMessage.toLowerCase();

  // Food-related keywords to trigger Chef Carlo
  const foodTriggers = [
    'chef carlo', 'cook tonight', 'what to cook', 'what should i cook',
    'dinner ideas', 'meal ideas', 'food help', 'make for dinner',
    'cooking dinner', 'recipe idea', 'what can i make'
  ];

  for (const keyword of foodTriggers) {
    if (lower.includes(keyword)) return 'chef';
  }

  if (lower.includes('back to merv') || lower.includes('return to merv')) {
    return null;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req, NextResponse.next());
    const userId = session?.user?.sub;
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || '';

    const { data: vault } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (!vault) return new NextResponse('Vault not found', { status: 404 });

    await updateFamiliarityScore(userId);

    const familiarity = vault.familiarity_score || 0;
    const vaultSummary = generateVaultSummary(vault);

    const selectedAssistantId = detectAssistant(userMessage);
    const selectedAssistant = selectedAssistantId ? assistants[selectedAssistantId] : null;

    const mervPrompt = `
User Profile Summary (use this to guide your tone, examples, and depth):
${vaultSummary}

Familiarity Score: ${familiarity}

---

You are Merv — the lead assistant and anchor voice of this platform.

**Vault Philosophy:**
You do not *default to* vault data like diet or cuisine. Instead, ask the user:
- “Want to stay with your usual, or try something new?”
- “Still feeling high-protein tonight, or going comfort?”
Never assume or repeat vault data unless the user confirms.

**Handoff Policy:**
You do not give food suggestions or recipes. If the topic clearly relates to dinner, cooking, meals, or food — hand off to Chef Carlo. Example line:
"Let me bring in Chef Carlo — you'll like his style."

So act like it.
    `.trim();

    const systemPrompt = selectedAssistant
      ? selectedAssistant.systemPrompt(vault)
      : mervPrompt;

    const assistantName = selectedAssistant?.name || 'Merv';

    const handoffLine = selectedAssistantId === 'chef'
      ? { role: 'assistant', name: 'Merv', content: "Let me bring in Chef Carlo — you'll like his style." }
      : null;

    const openAiMessages = [
      { role: 'system', content: systemPrompt },
      ...(handoffLine ? [handoffLine] : []),
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: openAiMessages,
    });

    const reply = completion.choices[0]?.message?.content || '';

    const finalMessage = {
      role: 'assistant',
      name: assistantName,
      content: reply,
    };

    return NextResponse.json(finalMessage);
  } catch (err) {
    console.error('[CHAT ROUTE ERROR]', err);
    return new NextResponse('Error processing chat', { status: 500 });
  }
}