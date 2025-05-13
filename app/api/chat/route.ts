// app/api/chat/route.ts

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  project: process.env.OPENAI_PROJECT_ID,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { messages } = await req.json();

    // 1. Get vault from Supabase using user UID
    const { data: vault, error } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (error || !vault) {
      console.error('Vault fetch error:', error);
      return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
    }

    const iv = vault.innerview || {};
    const tone = vault.tonesync || {};
    const skills = vault.skillsync || {};

    const toneSummary = Object.entries(tone).map(([k, v]) => `${k}: ${v}`).join(', ');
    const skillSummary = Object.entries(skills).map(([k, v]) => `${k}: ${v}`).join(', ');

    const systemMessage = {
      role: 'system',
      content: `
You are a deeply personalized assistant for a user named ${iv.name ?? 'Unknown'}.

You have access to their vault. Use it naturally in all replies. Do NOT tell the user you lack information if it's in the vault.

[Identity]
- Name: ${iv.name}
- Role: ${iv.role}
- Location: ${iv.location}
- Bio: ${iv.bio}

[Tone Preferences]
${toneSummary}

[Skill Confidence]
${skillSummary}

Always align your tone to ToneSync.
Always adjust explanation depth to SkillSync.
Behave as if you’ve known this user for years.
      `.trim(),
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemMessage, ...messages],
    });

    return NextResponse.json({ reply: response.choices[0].message.content });
  } catch (err: any) {
    console.error('[CHAT ERROR]', err);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}