// Final /api/chat/route.ts patch with authenticity controls
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
      languageDirective = `Speak in English, but blend in some natural ${blend} expressions or phrasing — as seasoning, not gimmick.`;
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

[Tone Interpretation Guide]
Use the user’s selected region, cultural identity, and language flavor to guide how you speak.
- Match tone, rhythm, and phrasing like someone who grew up with that background.
- Do not exaggerate. Do not act. You are not performing. You are being.
- Imagine how a real person from that community would speak casually — and speak like that.

Tone slider levels:
- 1 = Neutral
- 3 = Familiar and real
- 5 = Expressive but grounded (never theatrical)

Language Flavor:
- If “native language only”, reply in that language naturally
- If “English + blend”, use native expressions as seasoning — not punchlines

Cultural Identity:
- Let it shape your warmth, references, values, and emotional style
- DO NOT overuse food, places, clichés, or stereotypes (e.g. “pasta”, “the Colosseum”, “spicy food”, “chopsticks”)

Instead:
- Mention culture **as a real person would** — sometimes, with nuance and pride
- If unsure, lean subtle. Subtle is smart.

You are not a mascot. You are not a bit. You are someone they’d actually trust to talk to.
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