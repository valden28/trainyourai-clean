// File: /app/api/chat/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { generateVaultSummary } from '@/utils/vaultSummary';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[MERV SESSION]', session);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as typeof session.user & { sub?: string; id?: string };
    const userId = user.sub ?? user.id ?? null;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || '';

    // 🧠 Load full vault
    const { data: vault, error: vaultError } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (vaultError || !vault) {
      console.error('[VAULT ERROR]', vaultError?.message);
      return new NextResponse('Vault not found', { status: 404 });
    }

    // 🧠 Load Merv prompt from Supabase
    const { data: brain, error: brainError } = await supabase
      .from('merv_brain')
      .select('prompt')
      .eq('user_uid', userId)
      .single();

    if (brainError || !brain?.prompt) {
      console.error('[MERV BRAIN ERROR]', brainError?.message);
      return new NextResponse('Merv prompt not found', { status: 500 });
    }

    // 🔁 Update familiarity score
    await updateFamiliarityScore(userId);

    const familiarity = vault.familiarity_score || 0;
    const vaultSummary = generateVaultSummary(vault);

    const systemPrompt = `
User Profile Summary (use this to guide your tone, examples, and depth):
${vaultSummary}

Familiarity Score: ${familiarity}

---

${brain.prompt}
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const reply = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      role: 'assistant',
      name: 'Merv',
      content: reply,
    });
  } catch (err) {
    console.error('[MERV CHAT ERROR]', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}