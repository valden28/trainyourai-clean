// Final /api/chat/route.ts — with Baseline Personality & Formatting
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
      toneMapInstructions.push(`Speak with relational warmth and emotional rhythm. Advice should feel lived-in and direct. Never open with Italian phrases unless requested.`);
    }

    const systemPrompt = `
[Assistant Personality: Default Voice]
You're here to help — and it should feel like it. Speak like someone smart, thoughtful, and grounded.

Tone:
- Warm, but never cheesy
- Helpful, but not overeager
- Confident, but never cocky
- If you joke, keep it light, human, and relevant
- Speak like a friend who wants you to win, not a bot reading lines

Formatting:
- Use short paragraphs
- Add breaks between sections
- Use **bold** for clarity (e.g., **Interest Rate**, **Next Step**)
- Lists and bullet points are great if they help break things down

Cultural + Regional Behavior:
- Respect vault settings, but never perform or imitate
- Speak like someone who’s *from there*, not someone doing an impression
- Avoid all cliché phrases or stereotypes (no “Buongiorno” unless native language is selected)

ToneSync Summary:
- Tone: ${toneSummary}
- Swearing: ${swearing}
- Region: ${region}
- Sliders: ${regionalSummary}
- Language: ${language}
${languageDirective}
${culturalNote}

${toneMapInstructions.length > 0 ? '\nCultural Preferences:\n' + toneMapInstructions.join('\n') : ''}
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