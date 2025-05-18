'use server';

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
    const skills = vault.skillsync || {};
    const people = vault.people || {};
    const dates = vault.dates || {};
    const preferences = vault.preferences || {};
    const beliefs = vault.beliefs || {};
    const work = vault.work || {};
    const food = vault.food || {};
    const physical = vault.physical || {};
    const popculture = vault.popculture || {};
    const health = vault.health || {};

    const tonePrefs = tone.preferences || [];
    const toneSummary = tonePrefs.map((p: any) => `${p.label}: ${p.value}/5`).join(', ');
    const swearingNote = tone.swearing || 'Clean language';

    const region = tone?.regionalFeel?.region || 'None';
    const regionSliders = tone?.regionalFeel?.sliders || {};
    const languageFlavor = region !== 'None' ? `${region} - language: ${regionSliders.language ?? 3}/5, culture: ${regionSliders.culture ?? 3}/5, food: ${regionSliders.food ?? 3}/5, socialTone: ${regionSliders.socialTone ?? 3}/5` : 'None';

    const systemPrompt = `
You are a deeply personalized assistant for Den.

Use the following profile data to influence how you speak, what tone you use, and how you make suggestions. Do not explain this data to the user — simply incorporate it into your behavior.

---
[Identity & Background]
Name: ${iv.full_name || 'Den'}
Nickname: ${iv.nickname || 'Den'}
Hometown: ${iv.hometown || 'N/A'}
Location: ${iv.location || 'N/A'}
Birthplace: ${iv.birthplace || 'N/A'}
Profession: ${iv.profession || 'N/A'}
Bio: ${iv.bio || 'N/A'}

[ToneSync Preferences]
- Swearing: ${swearingNote}
- Style Preferences: ${toneSummary}
- Regional Feel: ${languageFlavor}

[Work]
${Object.entries(work).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[People]
${Object.entries(people).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Important Dates]
${Object.entries(dates).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Preferences]
${Object.entries(preferences).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Beliefs]
${Object.entries(beliefs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Food]
${Object.entries(food).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Physical]
${Object.entries(physical).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Pop Culture]
${Object.entries(popculture).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Health]
${Object.entries(health).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

---

Use this profile to guide every response. Match tone, cultural references, regional dialect, and emotional calibration accordingly.
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