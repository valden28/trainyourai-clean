// ✅ File: /app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import { updateFamiliarityScore } from '@/utils/familiarity';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'edge';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    // 🔐 Auth: identify the logged-in user
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 📨 Parse request body
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) return NextResponse.json({ error: 'Missing messages' }, { status: 400 });

    // 📦 Load vault
    const { data: vault } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', user_uid)
      .single();
    if (!vault) return NextResponse.json({ error: 'Vault not found' }, { status: 404 });

    // 🧠 Load Merv persona prompt
    const { data: brain } = await supabase
      .from('merv_brain')
      .select('prompt')
      .eq('user_uid', user_uid)
      .single();
    if (!brain?.prompt) return NextResponse.json({ error: 'Merv prompt not found' }, { status: 500 });

    // 🧩 Familiarity & vault summary
    await updateFamiliarityScore(user_uid).catch(() => {});
    const familiarity = vault?.familiarity_score ?? 0;
    const vaultSummary = generateVaultSummary(vault);

    // 🧱 System prompt context
    const systemPrompt = `
User Profile Summary:
${vaultSummary}

Familiarity Score: ${familiarity}

---
${brain.prompt}
`.trim();

    // 🎯 Tone anchor before user messages
    const assistantPrimer = {
      role: 'assistant' as const,
      name: 'Merv',
      content:
        'Understood. I will answer with an executive summary, an action list, and concise watch-outs as needed. No generic disclaimers.',
    };

    // ✂️ Limit chat history for focus
    const trimmed = messages.slice(-8);

    // 🧠 Query OpenAI model
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        assistantPrimer,
        ...trimmed,
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      role: 'assistant',
      name: 'Merv',
      content: reply,
    });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    return NextResponse.json(
      { role: 'assistant', name: 'Merv', content: `Error: ${err.message}` },
      { status: 500 }
    );
  }
}
