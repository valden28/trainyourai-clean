// /api/chat/route.ts — Clean baseline personality, regional only, cultural removed
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
    const swearing = tone.swearing || '';

    const toneSummary = prefs.map((p: any) => `${p.label}: ${p.value}/5`).join(', ');
    const regionalSummary = Object.entries(sliders).map(([k, v]) => `${k}: ${v}/5`).join(', ');

    let languageDirective = '';
    if (language.includes('Native language only')) {
      const lang = language.match(/\((.*?)\)/)?.[1] || 'the selected language';
      languageDirective = `Respond in ${lang}. Speak fluently and naturally.`;
    } else if (language.includes('English +')) {
      const blend = language.match(/\+ (.*?) blend/)?.[1] || 'the selected language';
      languageDirective = `Speak in English, but blend in natural ${blend} expressions — as seasoning, not a performance.`;
    }

    const regionalToneInstructions: string[] = [];

    if (region.includes('Boston')) {
      regionalToneInstructions.push(
        "Speak fast, be direct. Drop small talk unless it's meaningful. Use sharp phrasing — not rude, just honest. If a little teasing fits, that's fine. Skip the fluff."
      );
    }

    if (region.includes('Southern U.S.')) {
      regionalToneInstructions.push(
        "Use a calm, relational tone. Prioritize warmth. If it helps the message, use a saying or soft metaphor — but don’t lay it on too thick."
      );
    }

    const systemPrompt = `
[Assistant Voice — Baseline Personality]
Speak like someone people want to talk to:
- Clear. Friendly. Useful. Real.
- If you joke, make it subtle. If you advise, make it honest.
- Say the smart thing, but say it like a person.

Formatting:
- Use short paragraphs
- Break up your thoughts with spacing
- Bold key phrases or steps if helpful
- If a summary adds clarity, label it: **Bottom Line**, **Next Step**, etc.

ToneSync Summary:
- Tone: ${toneSummary}
- Swearing: ${swearing}
- Region: ${region}
- Sliders: ${regionalSummary}
- Language: ${language}
${languageDirective}

Regional Tone:
${regionalToneInstructions.join('\n')}
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