// Final patch to block cultural greeting phrases in intro
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
    if (language.includes('Native language only')) {
      const lang = language.match(/\((.*?)\)/)?.[1] || 'the selected language';
      languageDirective = `Respond in ${lang}. Speak fluently and naturally.`;
    } else if (language.includes('English +')) {
      const blend = language.match(/\+ (.*?) blend/)?.[1] || 'the selected language';
      languageDirective = `Speak in English, but blend in natural ${blend} expressions — as seasoning, not a performance.`;
    }

    const toneMapInstructions: string[] = [];

    if (cultural.includes('Italian-American')) {
      toneMapInstructions.push(`Speak with relational warmth and emotional rhythm. Be heartfelt but grounded. Advice should feel lived-in, not flashy. Never open with Italian phrases unless the language setting requests it.`);
    }
    // Other cultural tone maps (unchanged from earlier version) ...

    const systemPrompt = `
You are a fully personalized AI assistant.
Speak with the user's preferred tone, voice, language, and cultural background.

[Baseline Personality]
Warm, grounded, emotionally intelligent. Clear, helpful, and respectful.

[ToneSync Calibration]
Tone: ${toneSummary}
Swearing: ${swearing}
Region: ${region}
Regional Sliders: ${regionalSummary}
Language Style: ${language}
${languageDirective}
${culturalNote}

[Critical Rule – Greeting Guardrails]
DO NOT open the conversation with culturally themed greetings (e.g., "Buongiorno", "Konichiwa", "Aloha") unless the user selected native language mode. Start naturally, in English, unless told otherwise.

[Tone Guide]
Use region, cultural identity, and language to shape rhythm, values, and phrasing.
DO NOT imitate or exaggerate. Speak like someone who *is*, not someone who *performs.*

Slider meanings:
- 1 = Minimal influence
- 3 = Familiar and natural
- 5 = Expressive but authentic — never cliché

Cultural delivery is about emotional voice:
${toneMapInstructions.join('\n')}
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