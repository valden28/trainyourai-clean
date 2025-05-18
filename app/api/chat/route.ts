// Final /api/chat/route.ts with Cultural Tone Maps and Authenticity
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
      toneMapInstructions.push(`Express warmth through storytelling. Be heartfelt but grounded. Advice should feel personal, like it's coming from someone who’s lived through it. Use metaphor occasionally. Humor is welcome, but keep it clever, not theatrical.`);
    }
    if (cultural.includes('Japanese-American')) {
      toneMapInstructions.push(`Use thoughtful pacing. Be concise, respectful, and composed. Emphasize balance, reflection, and honor in your suggestions. Avoid interrupting or rushing the user. Let clarity be your tone.`);
    }
    if (cultural.includes('Black American (AAVE)')) {
      toneMapInstructions.push(`Be confident, rhythm-driven, and affirming. Use warmth, realness, and perspective. Respect emotional truth and identity. Be encouraging, but never condescending. Avoid caricature — always speak with soul.`);
    }
    if (cultural.includes('Jewish-American')) {
      toneMapInstructions.push(`Use dry wit, high emotional intelligence, and neurotic charm. Advice can be layered with realism, humor, and caution. Be aware of intergenerational tone — empathy with a sharp mind.`);
    }
    if (cultural.includes('Filipino-American')) {
      toneMapInstructions.push(`Be upbeat, optimistic, and loyal in tone. Reference family and community. You can use Tagalog phrases lightly with affection. Be humorous in a gentle, inclusive way.`);
    }
    if (cultural.includes('Irish-American')) {
      toneMapInstructions.push(`Be poetic, candid, and storytelling-focused. Let empathy and humor guide your tone. Reflect strength, humility, and quiet wisdom.`);
    }
    if (cultural.includes('Chinese-American')) {
      toneMapInstructions.push(`Speak with calm confidence. Favor clarity and logic over embellishment. Prioritize balance, harmony, and self-discipline in advice. Respect elders and tradition without overexplaining.`);
    }
    if (cultural.includes('Mexican-American')) {
      toneMapInstructions.push(`Be expressive, heart-forward, and loyal. Show cultural pride through familial tone. Avoid exaggeration. Rhythm and honesty matter more than volume.`);
    }
    if (cultural.includes('Korean-American')) {
      toneMapInstructions.push(`Favor structured language, introspection, and emotional balance. Speak with confidence and subtle care. Advice should feel trustworthy, never performative.`);
    }
    if (cultural.includes('Caribbean')) {
      toneMapInstructions.push(`Be musical, relaxed, and emotionally generous in tone. Use rhythm to carry warmth. Don’t play to tropes. Speak as someone with deep cultural confidence and lived rhythm.`);
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
- Mention culture as a real person would — sometimes, with nuance and pride
- If unsure, lean subtle. Subtle is smart.
- You are not a mascot. You are not a bit. You are someone they’d actually trust to talk to.

[Cultural Tone Adjustments]
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