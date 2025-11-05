// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import { updateFamiliarityScore } from '@/utils/familiarity';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Accept only 'user' | 'assistant' and non-empty string content
function sanitizeHistory(input: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => {
      const rawRole = (m.role || '').toString().toLowerCase();
      const role: 'user' | 'assistant' =
        rawRole === 'assistant' ? 'assistant' : 'user'; // default anything else to 'user'
      return { role, content: m.content.trim() };
    });
}

export async function POST(req: NextRequest) {
  try {
    // 🔐 Auth
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 📨 Body
    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const history = sanitizeHistory(incoming);
    const lastUserMsg = history.slice().reverse().find((m) => m.role === 'user')?.content || '';

    if (history.length === 0) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
    }

    // 📦 Vault
    const { data: vault, error: vErr } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', user_uid)
      .single();
    if (vErr || !vault) return NextResponse.json({ error: 'Vault not found' }, { status: 404 });

    // 🧠 Persona
    const { data: brain, error: bErr } = await supabase
      .from('merv_brain')
      .select('prompt')
      .eq('user_uid', user_uid)
      .single();
    if (bErr || !brain?.prompt) {
      return NextResponse.json({ error: 'Merv prompt not found' }, { status: 500 });
    }

    // 📈 Familiarity + summary
    await updateFamiliarityScore(user_uid).catch(() => {});
    const familiarity = vault?.familiarity_score ?? 0;
    const vaultSummary = generateVaultSummary(vault);

    // 🧱 System prompt
    const systemPrompt = `
User Profile Summary:
${vaultSummary}

Familiarity Score: ${familiarity}

---
${brain.prompt}
`.trim();

    // 🎯 Assistant primer
    const primer: { role: 'assistant'; content: string } = {
      role: 'assistant',
      content:
        'Understood. I will answer with an executive summary, an action list, and concise watch-outs as needed. No generic disclaimers.',
    };

    // ✂️ Use the last 8 cleaned messages (model sees only valid roles/content)
    const trimmed = history.slice(-8);

    // 🧠 Model call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        primer,
        ...trimmed,
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || '[No reply]';

    return NextResponse.json({
      role: 'assistant',
      name: 'Merv',
      content: reply,
    });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    // Bubble the OpenAI error up so you can see it in the client if needed
    return NextResponse.json(
      { role: 'assistant', name: 'Merv', content: `Error: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}
