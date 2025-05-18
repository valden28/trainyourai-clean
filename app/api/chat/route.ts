// Final /api/chat/route.ts — Clean backend route
// Supports ToneSync with region, sliders, swearing, languageFlavor, culturalIdentity

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req, NextResponse.next());
    const userId = session?.user?.sub;
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const { messages } = await req.json();

    const { data: vault } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (!vault) return new NextResponse('Vault not found', { status: 404 });

    await updateFamiliarityScore(userId);

    const tone = vault.tonesync || {};
    const prefs = tone.preferences || [];
    const region = tone.regionalFeel?.region || '';
    const sliders = tone.regionalFeel?.sliders || {};
    const language = tone.languageFlavor || '';
    const cultural = tone.culturalIdentity || [];
    const swearing = tone.swearing || '';

    const toneSummary = prefs.map((p: any) => `${p.label}: ${p.value}/5`).join(', ');
    const regionalSummary = Object.entries(sliders).map(([k, v]) => `${k}: ${v}/5`).join(', ');
    const culturalNote = cultural.length ? `Cultural Identity: ${cultural.join(', ')}` : '';

    let languageDirective = '';
    if (language === 'Native language only') {
      if (region === 'Indian English') languageDirective = 'Reply in Hindi unless clarity requires English.';
      if (region === 'Caribbean') languageDirective = 'Reply in Patois where possible.';
      if (region === 'Asian / Pacific Islander') languageDirective = 'Use Tagalog, Vietnamese, or native language as context allows.';
    } else if (language === 'English + native blend') {
      if (region === 'Indian English') languageDirective = 'Use English with casual Hindi expressions.';
      if (region === 'Caribbean') languageDirective = 'Blend English with Patois tone.';
      if (region === 'Asian / Pacific Islander') languageDirective = 'Include familiar native phrases in English.';
    }

    const systemPrompt = `
You are a fully personalized AI assistant.
Speak with the user's preferred tone, voice, language, and cultural background.

[ToneSync]
Tone: ${toneSummary}
Swearing: ${swearing}
Region: ${region}
Regional Sliders: ${regionalSummary}
Language Style: ${language}
${languageDirective}
${culturalNote}

Use this data to adjust:
- Vocabulary
- Humor
- Formality
- Storytelling style
- Cultural references
- Food, family, and emotional tone

Be human. Be culturally aware. Reflect the voice of someone who knows the user.
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const part of completion) {
          const text = part.choices[0]?.delta?.content || '';
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      }
    });

    return new Response(stream);
  } catch (err) {
    console.error('[CHAT STREAM ERROR]', err);
    return new NextResponse('Error streaming response', { status: 500 });
  }
}