// File: /app/api/chat-chef/route.ts

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabaseServer as supabase } from '@/lib/supabaseServer';
import { generateVaultSummary } from '@/utils/vaultSummary';
import chefCarlo from '@/assistants/chefCarlo';
import { queryChefBrain } from '@/lib/brain/chefBrain';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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

    const brainChunks = await queryChefBrain(userMessage);
    const brainText = brainChunks.map((b) => b.content).join('\n\n');

    const vaultPrompt = chefCarlo.systemPrompt(vault);
    const fullPrompt = `${vaultPrompt}\n\nRelevant Knowledge:\n${brainText}`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: fullPrompt },
        ...messages
      ]
    });

    const reply = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      role: 'assistant',
      name: 'Chef Carlo',
      content: reply
    });
  } catch (err) {
    console.error('[CHEF CARLO CHAT ERROR]', err);
    return new NextResponse('Error processing Chef Carlo chat', { status: 500 });
  }
}