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
  if (lower.includes('chef carlo') || lower.includes('menu') || lower.includes('recipe') || lower.includes('cook something') || lower.includes('cooking with')) {
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

    const mervPrompt = `
User Profile Summary (use this to guide your tone, examples, and depth):
${vaultSummary}

Familiarity Score: ${familiarity}

---

You are Merv — the lead assistant and anchor voice of this platform. [...full Merv prompt omitted for brevity...]
So act like it.
    `.trim();

    const systemPrompt = selectedAssistant
      ? selectedAssistant.systemPrompt(vault)
      : mervPrompt;

    const handoffMessage = selectedAssistantId === 'chef'
      ? {
          role: 'assistant',
          name: 'Merv',
          content: "Let me step back and bring in Chef Carlo — you’ll appreciate his style."
        }
      : null;

    const responseAssistantName = selectedAssistant?.name || 'Merv';

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
          if (text) {
            controller.enqueue(encoder.encode(JSON.stringify({ name: responseAssistantName, text })));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (err) {
    console.error('[CHAT STREAM ERROR]', err);
    return new NextResponse('Error streaming response', { status: 500 });
  }
}