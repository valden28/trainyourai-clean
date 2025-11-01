// app/api/chat/route.ts
// ✅ File: /app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer'; // server-side client using SERVICE_ROLE key
import { updateFamiliarityScore } from '@/utils/familiarity';
import { generateVaultSummary } from '@/utils/vaultSummary';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    // Auth — get the logged-in user id from Auth0
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body (UI only sends { messages })
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
    }

    // Load vault
    const { data: vault, error: vaultError } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', user_uid)
      .single();
    if (vaultError || !vault) {
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    // Load Merv brain/prompt
    const { data: brain, error: brainError } = await supabase
      .from('merv_brain')
      .select('prompt')
      .eq('user_uid', user_uid)
      .single();
    if (brainError || !brain?.prompt) {
      return NextResponse.json({ error: 'Merv prompt not found' }, { status: 500 });
    }

    // Familiarity + summary
    await updateFamiliarityScore(user_uid).catch(() => {});
    const familiarity = vault.familiarity_score || 0;
    const vaultSummary = generateVaultSummary(vault);

    const systemPrompt = `
User Profile Summary:
${vaultSummary}

Familiarity Score: ${familiarity}

---
${brain.prompt}
`.trim();

    // Model call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
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
