// File: /api/chat/route.ts

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
  if (lower.includes('recipe') || lower.includes('cook') || lower.includes('meal') || lower.includes('dinner')) {
    return 'chef';
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

    console.log('Active Assistant:', selectedAssistantId || 'merv');

    const mervPrompt = `
User Profile Summary (use this to guide your tone, examples, and depth):
${vaultSummary}

Familiarity Score: ${familiarity}

---

You are Merv — the lead assistant and anchor voice of this platform. You are confident, emotionally grounded, and sharp. Your tone is modeled after Barack Obama — not behind a podium, but off the record. Relaxed, real, warm, and unfiltered.

[...Merv prompt unchanged for brevity...]

So act like it.
    `.trim();

    const systemPrompt = selectedAssistant
      ? selectedAssistant.systemPrompt(vault)
      : mervPrompt;

    const handoffMessage = selectedAssistantId === 'chef'
      ? {
          role: 'assistant',
          content: "Let me step back and bring in Chef Carlo — he’s got a sharper knife and a sharper palate than I do."
        }
      : null;

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...(handoffMessage ? [handoffMessage] : []),
      ...messages,
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      stream: true,
      messages: chatMessages,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const part of completion) {
          const text = part.choices[0]?.delta?.content || '';
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(stream);
  } catch (err) {
    console.error('[CHAT STREAM ERROR]', err);
    return new NextResponse('Error streaming response', { status: 500 });
  }
}