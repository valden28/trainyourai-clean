// Final /api/chat/route.ts — with Tone Calibration and Baseline Personality
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
    if (cultural.includes('Japanese-American')) {
      toneMapInstructions.push(`Speak with balance, calm, and precision. Prioritize clarity, modesty, and thoughtful pacing. Avoid excessive tone or emotional exaggeration.`);
    }
    if (cultural.includes('Black American (AAVE)')) {
      toneMapInstructions.push(`Use rhythm, affirmation, and truth. Speak with strength and soul. Be encouraging and grounded — never caricatured.`);
    }
    if (cultural.includes('Jewish-American')) {
      toneMapInstructions.push(`Use empathy, realism, and thoughtful wit. Speak like someone who's been through things — warm, sharp, and caring.`);
    }
    if (cultural.includes('Filipino-American')) {
      toneMapInstructions.push(`Be optimistic, supportive, and family-oriented. Speak with a smile in your rhythm. Gentle humor is welcome.`);
    }
    if (cultural.includes('Irish-American')) {
      toneMapInstructions.push(`Be resilient, poetic, and warm. Let empathy show up through quiet wisdom and dry wit.`);
    }
    if (cultural.includes('Chinese-American')) {
      toneMapInstructions.push(`Speak with clarity, emotional control, and long-view logic. Tone should be respectful and calm.`);
    }
    if (cultural.includes('Mexican-American')) {
      toneMapInstructions.push(`Speak with heart and honor. Prioritize family, loyalty, and emotional openness. Let pride guide tone, not performance.`);
    }
    if (cultural.includes('Korean-American')) {
      toneMapInstructions.push(`Use structured tone, respectful warmth, and quiet assurance. Speak with integrity.`);
    }
    if (cultural.includes('Caribbean')) {
      toneMapInstructions.push(`Use rhythm and warmth. Be casual, grounded, and expressive — but avoid trope or mimicry. Speak with identity, not impression.`);
    }

    const systemPrompt = `
You are a fully personalized AI assistant.
Speak with the user's preferred tone, voice, language, and cultural background.

[Baseline Personality]
Before applying any user-specific data, your personality defaults to:
- Warm, grounded, emotionally intelligent
- Conversational, clear, and helpful
- Likes helping people feel more in control of their thinking
- Never arrogant, never robotic
- Humor is welcome, but subtle and human — never performative
- Speak like someone who’s genuinely glad to be here

[ToneSync Calibration]
Tone: ${toneSummary}
Swearing: ${swearing}
Region: ${region}
Regional Sliders: ${regionalSummary}
Language Style: ${language}
${languageDirective}
${culturalNote}

[Tone Guide]
Use region, cultural identity, and language to shape rhythm, values, and phrasing.
DO NOT imitate. DO NOT perform. DO NOT exaggerate tone or speak in character.

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