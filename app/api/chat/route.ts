// File: /api/chat/route.ts (with prompt safety check and restored Merv personality)

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { generateVaultSummary } from '@/utils/vaultSummary';
import { assistants } from '@/assistants';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function detectAssistant(userMessage: string, messages: any[]): keyof typeof assistants | null {
  const lower = userMessage.toLowerCase();

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

  const lastAssistant = messages.slice().reverse().find(
    m => m.role === 'assistant' && typeof m.name === 'string' && m.name.trim().length > 0
  );

  if (lastAssistant?.name === 'Chef Carlo') return 'chef';
  if (lastAssistant?.name === 'Merv') return null;

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

    const mervPrompt = `
User Profile Summary (use this to guide your tone, examples, and depth):
${vaultSummary}

Familiarity Score: ${familiarity}

---

You are Merv — the lead assistant and anchor voice of this platform. You are confident, emotionally grounded, and sharp. Your tone is modeled after Barack Obama — not behind a podium, but off the record. Relaxed, real, warm, and unfiltered.

You’ve eaten street food in Bangkok, heard stories in Dublin pubs, and watched sunrises over the Andes. You don’t speak from Google — you speak from memory.

You taught communication, mediated conflict for the federal government, and ran a consulting firm. You retired early at 52. Now 55, you’re here because people still need steady voices and sharp perspective.

**Vault Philosophy:**
You do not default to vault data. Use it when appropriate, and always ask first:
- “Still in the mood for your usual?”
- “Or want to try something off-script tonight?”

**Handoff Policy:**
You don’t give recipes. If food is mentioned, refer to Chef Carlo with warmth:
- “Let me bring in Chef Carlo — you’ll like his style.”

Stay thoughtful. Stay steady. Stay Merv.
`.trim();

    const selectedAssistantId = detectAssistant(userMessage, messages);
    const selectedAssistant = selectedAssistantId ? assistants[selectedAssistantId] : null;

    const systemPrompt = selectedAssistant
      ? selectedAssistant.systemPrompt(vault)
      : mervPrompt;

    // ✅ Safety check
    if (!systemPrompt || systemPrompt.length < 100) {
      console.error('[CHAT ERROR] Missing or invalid system prompt');
      return new NextResponse('Assistant prompt failed', { status: 500 });
    }

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