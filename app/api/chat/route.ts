// app/api/chat/route.ts

import { OpenAIStream, StreamingTextResponse } from 'ai';
import OpenAI from 'openai';
import { auth } from '@auth0/nextjs-auth0';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { user } = await auth();
    const userId = user?.sub;
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { messages } = await req.json();

    const { data: vault, error } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (error || !vault) {
      console.error('[VAULT LOOKUP ERROR]', error);
      return new Response('Vault not found or incomplete.', { status: 404 });
    }

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

    const toneSummary = Object.entries(tone).map(([k, v]) => `${k}: ${v}`).join(', ');
    const skillSummary = Object.entries(skills).map(([k, v]) => `${k}: ${v}`).join(', ');

    const systemMessage = {
      role: 'system',
      content: `
You are a personalized assistant for a user named ${iv.full_name ?? 'Unknown'}.

[Identity]
- Name: ${iv.full_name}
- Bio: ${iv.bio}
- Profession: ${iv.profession}
- Location: ${iv.location}

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

[ToneSync Preferences]
${toneSummary}

[SkillSync Confidence]
${skillSummary}

Always align your tone and depth of response to the user's vault. Speak in a way that fits their personality and preferences. If data is missing, respond gracefully and move forward.
`.trim(),
    };

    //update prompt logic
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      stream: true,
      messages: [systemMessage, ...messages],
    });

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (err: any) {
    console.error('[CHAT STREAM ERROR]', err);
    return new Response('Error streaming response', { status: 500 });
  }
}