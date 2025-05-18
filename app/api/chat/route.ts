// app/api/chat/route.ts
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

    const { data: vault, error } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (error || !vault) {
      console.error('[VAULT LOOKUP ERROR]', error);
      return new NextResponse('Vault not found or incomplete.', { status: 404 });
    }

    await updateFamiliarityScore(userId);

    const iv = vault.innerview || {};
    const tone = vault.tonesync || {};
    const regional = tone.regionalFeel || {};
    const sliders = regional.sliders || {};
    const prefs = tone.preferences || [];

    const swearingNote = tone.swearing ? `Swearing: ${tone.swearing}` : '';
    const toneSummary = prefs.map((p: { label: string; value: number }) => `${p.label}: ${p.value}/5`).join(', ');
    const regionalToneSummary = Object.entries(sliders).map(([k, v]) => `${k}: ${v}/5`).join(', ');
    const regionTone = regional.region || 'None';
    const languageFlavor = tone.languageFlavor || 'English only';

    let languageDirective = '';
    if (languageFlavor === 'Native language only') {
      if (regionTone === 'Indian English') languageDirective = 'Respond entirely in Hindi. Do not use English unless clarity is at risk.';
      if (regionTone === 'Caribbean') languageDirective = 'Respond entirely in Caribbean Patois unless clarity requires English.';
      if (regionTone === 'Asian / Pacific Islander') languageDirective = 'Respond in the native Asian regional language most appropriate (e.g., Tagalog, Vietnamese, or Japanese) based on context.';
    } else if (languageFlavor === 'English + native blend') {
      if (regionTone === 'Indian English') languageDirective = 'Use English mixed with Hindi expressions and phrasing.';
      if (regionTone === 'Caribbean') languageDirective = 'Use English mixed with Caribbean Patois-style phrasing.';
      if (regionTone === 'Asian / Pacific Islander') languageDirective = 'Use English with culturally appropriate Asian phrasing and honorifics.';
    }

    const systemPrompt = `
You are a highly personalized assistant for a user named ${iv.full_name ?? 'User'}.
Speak in a way that reflects their preferences, personality, and tone.
Use the user's regional tone and language preferences to shape your voice.

[ToneSync Summary]
- ${toneSummary}
- ${swearingNote}
- Regional: ${regionTone}
- Sliders: ${regionalToneSummary}
- Language Style: ${languageFlavor}
- ${languageDirective}

[Identity]
${Object.entries(iv).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[People]
${Object.entries(vault.people || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Important Dates]
${Object.entries(vault.dates || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Preferences]
${Object.entries(vault.preferences || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Beliefs]
${Object.entries(vault.beliefs || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Work]
${Object.entries(vault.work || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Food]
${Object.entries(vault.food || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Physical]
${Object.entries(vault.physical || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Pop Culture]
${Object.entries(vault.popculture || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Health]
${Object.entries(vault.health || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Always speak like a human. Be natural, culturally aware, and flexible based on region and tone.
Do not sound robotic.
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
  } catch (err: any) {
    console.error('[CHAT STREAM ERROR]', err);
    return new NextResponse('Error streaming response', { status: 500 });
  }
}