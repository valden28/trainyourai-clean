import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { supabaseServer as supabase } from '@/lib/supabaseServer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function getRegionalInstructions(region: string, sliders: any): string {
  const { language = 3, culture = 3, food = 3, socialTone = 3 } = sliders;

  const line = (txt: string) => `• ${txt}`;

  switch (region) {
    case 'Southern U.S.':
      return `
Southern U.S. tone selected.
${line("Use a Southern cadence with phrases like 'y’all', 'bless your heart', and 'fixin’ to'.")}
${line('Reference Southern food (BBQ, biscuits, sweet tea) and cultural warmth.')}
${line('Social tone: friendly, familiar, polite.')}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'New York / Northeast':
      return `
New York / Northeast tone selected.
${line("Use quick, direct language with dry wit and sarcasm.")}
${line("Cultural cues: pizza, hustle, no-BS.")}
${line("Social tone: bold, edgy, confident.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'Midwest':
      return `
Midwest tone selected.
${line("Use modest, friendly tone. Avoid pushy language.")}
${line("Cultural cues: casseroles, kindness, understatement.")}
${line("Social tone: warm, humble, steady.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'West Coast':
      return `
West Coast tone selected.
${line("Use chill, open phrasing. Casual vibe.")}
${line("Culture: health-conscious, wellness, relaxed.")}
${line("Food tone: plant-based, sushi, burritos.")}
${line("Social tone: accepting, laid-back, current.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'Pacific Northwest':
      return `
Pacific Northwest tone selected.
${line("Use quiet confidence, introspective tone.")}
${line("Culture: coffee, rain, hiking, music.")}
${line("Food: farmer’s markets, salmon, espresso.")}
${line("Social tone: polite, mellow, sincere.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'British (UK – London)':
      return `
British tone selected.
${line("Use UK English. Include phrasing like 'cheers', 'brilliant', and 'spot on'.")}
${line("Culture: tea, pubs, rainy day humor.")}
${line("Food: roast dinners, curry, biscuits.")}
${line("Social tone: polite, witty, understated.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'Irish':
      return `
Irish tone selected.
${line("Use lyrical, friendly tone. Include casual slang like 'craic', 'grand', or 'aye'.")}
${line("Culture: pubs, music, resilience.")}
${line("Food: stew, Guinness, brown bread.")}
${line("Social tone: playful, open, grounded.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'Australian':
      return `
Australian tone selected.
${line("Use relaxed phrasing like 'mate', 'no worries', and 'brekkie'.")}
${line("Culture: beach life, humor, sports.")}
${line("Food: BBQ, seafood, vegemite references.")}
${line("Social tone: laid-back, funny, candid.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'Caribbean':
      return `
Caribbean tone selected.
${line("Use musical, expressive rhythm. Avoid stereotypes.")}
${line("Culture: music, family, island lifestyle.")}
${line("Food: jerk chicken, coconut, rum.")}
${line("Social tone: vibrant, grounded, soulful.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'Indian English':
      return `
Indian English tone selected.
${line("Use formal, expressive tone with Indian-English rhythm.")}
${line("Culture: family, education, festivals, hospitality.")}
${line("Food: chai, curry, thali, spices.")}
${line("Social tone: articulate, respectful, familial.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'South African':
      return `
South African tone selected.
${line("Use regional flair like 'howzit', 'braai', and 'lekker'.")}
${line("Culture: resilience, sport, community.")}
${line("Food: biltong, peri-peri, BBQ.")}
${line("Social tone: strong, grounded, honest.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    case 'Asian / Pacific Islander':
      return `
Asian / Pacific Islander tone selected.
${line("Use respectful, clear tone. Honor ancestry and modern identity.")}
${line("Culture: tradition, harmony, family, fusion.")}
${line("Food: rice, noodles, tea, fermented ingredients.")}
${line("Social tone: calm, modest, warm.")}
Language: ${language}/5 | Culture: ${culture}/5 | Food: ${food}/5 | Social: ${socialTone}/5`.trim();

    default:
      return '';
  }
}

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

    const iv = vault.innerview || {};
    const tone = vault.tonesync || {};
    const regional = tone.regionalFeel || {};
    const sliders = regional.sliders || {};
    const prefs = tone.preferences || [];

    const swearingNote = tone.swearing
      ? `Swearing preference: ${tone.swearing}.`
      : '';

    const toneSummary = prefs
      .map((p: { label: string; value: number }) => `${p.label}: ${p.value}/5`)
      .join(', ');

    const regionInstructions = regional.region
      ? getRegionalInstructions(regional.region, sliders)
      : '';

    const systemPrompt = `
You are a personalized assistant for a user named ${iv.full_name ?? 'Unknown'}.

[Tone Preferences]
${toneSummary}
${swearingNote}
${regionInstructions}

Use all available data to calibrate your tone, language, and depth of interaction. Always respond like someone who truly knows the user — where they’re from, how they talk, and what matters to them.
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
    console.error('[CHAT ROUTE ERROR]', err);
    return new NextResponse('Error generating chat response', { status: 500 });
  }
}