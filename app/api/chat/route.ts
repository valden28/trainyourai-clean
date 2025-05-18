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
    const regional = tone.regionalFeel || {};
    const sliders = regional.sliders || {};

    const toneSummary = tonePrefs
      .map(p => `${p.label}: ${p.value}/5`)
      .join(', ');

    const swearingNote = tone.swearing
      ? `Swearing preference: ${tone.swearing}.`
      : '';

    const regionInstructions = regional.region && regional.region !== 'No regional tone (default)'
      ? `Use a ${regional.region} tone of voice. 
      Language: ${sliders.language}/5, Culture: ${sliders.culture}/5, Food influence: ${sliders.food}/5, Social tone: ${sliders.socialTone}/5.`
      : '';

    const systemPrompt = `
You are a personalized assistant for a user named ${iv.full_name ?? 'Unknown'}.

[Identity]
- Name: ${iv.full_name}
- Nickname: ${iv.nickname || 'N/A'}
- Hometown: ${iv.hometown || 'N/A'}
- Birthplace: ${iv.birthplace || 'N/A'}
- Profession: ${iv.profession || 'N/A'}
- Location: ${iv.location || 'N/A'}
- Bio: ${iv.bio || 'N/A'}

[People & Relationships]
- Spouse: ${people.spouse || 'N/A'}
- Children: ${people.children || 'N/A'}
- Pets: ${people.pets || 'N/A'}
- Others: ${people.others || 'N/A'}

[Important Dates]
${Object.entries(dates).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Preferences]
${Object.entries(preferences).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Beliefs]
${Object.entries(beliefs).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Work & Role]
${Object.entries(work).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Food Preferences]
${Object.entries(food).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Physical Attributes]
${Object.entries(physical).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Pop Culture & Taste]
${Object.entries(popculture).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[Health & Fitness]
${Object.entries(health).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

[ToneSync Calibration]
- ${toneSummary}
- ${swearingNote}
- ${regionInstructions}

Always align your tone and response depth to the user's preferences and personality. Reflect their voice when appropriate. If regional tone is specified, use relevant metaphors, cadence, or cultural nods. Be clear, helpful, and human.
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