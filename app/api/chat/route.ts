// app/api/chat/route.ts

import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
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
    const authData = await auth();
    const userId = authData.userId;
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { messages } = await req.json();

    const { data: vault, error } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    const iv = vault?.innerview || {};
    const tone = vault?.tonesync || {};
    const skills = vault?.skillsync || {};

    const toneSummary = Object.entries(tone).map(([k, v]) => `${k}: ${v}`).join(', ');
    const skillSummary = Object.entries(skills).map(([k, v]) => `${k}: ${v}`).join(', ');

    const systemMessage = {
      role: 'system',
      content: `
You are a deeply personalized assistant for a user named ${iv.name ?? 'Unknown'}.

[Vault Summary]
- Name: ${iv.name}
- Role: ${iv.role}
- Location: ${iv.location}
- Bio: ${iv.bio}

[ToneSync]
${toneSummary}

[SkillSync]
${skillSummary}

Always align your tone and depth of response to the vault preferences.
If any data is missing, behave gracefully and continue.
`.trim(),
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      stream: true,
      messages: [systemMessage, ...messages],
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (err: any) {
    console.error('[CHAT STREAM ERROR]', err);
    return new Response('Error streaming response', { status: 500 });
  }
}