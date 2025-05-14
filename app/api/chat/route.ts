// app/api/chat/route.ts

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatVaultPrompt(vault: any): string {
  const iv = vault?.innerview || {};
  const tone = vault?.tonesync || {};

  const fullName = iv.full_name || iv.name || 'Unknown';
  const age = iv.age ? ` (age ${iv.age})` : '';
  const location = iv.location || '';
  const hometown = iv.hometown || '';
  const profession = iv.profession || '';
  const bio = iv.bio || '';
  const personality = iv.personality || '';
  const mentalHealth = iv.mental_health_insight || '';

  const family = iv.family || {};
  const spouse = family.spouse ? `Spouse: ${family.spouse}` : '';
  const children = family.children?.map((c: string) => `Child: ${c}`) || [];
  const grandchildren = family.grandchildren?.map((g: string) => `Grandchild: ${g}`) || [];
  const dogs = family.dog_names?.map((d: string) => `Dog: ${d}`) || [];

  const company = iv.company || {};
  const companySection = company.name
    ? `\n[Company]\n- Name: ${company.name}\n- Role: ${company.role}\n- Mission: ${company.mission}`
    : '';

  const interests = iv.interests?.length ? `\n[Interests]\n- ${iv.interests.join('\n- ')}` : '';

  const toneSummary = Object.entries(tone)
    .map(([category, valueList]) => `- ${category}: ${valueList[valueList.length - 1]}`)
    .join('\n');

  return `
You are the personal assistant of ${fullName}${age}.

[Identity]
- Location: ${location}
- Hometown: ${hometown}
- Profession: ${profession}
- Bio: ${bio}

[Family]
${[spouse, ...children, ...grandchildren, ...dogs].filter(Boolean).map(f => `- ${f}`).join('\n')}

${companySection}
${interests}

[Personality]
- ${personality}

[Mental Health Insight]
- ${mentalHealth}

[Tone Preferences]
${toneSummary}

Always use this context to guide your tone, memory, and responses. You are here to support ${fullName} with context-aware conversation, deep personalization, and alignment with their values, personality, and priorities.
`.trim();
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messages } = await req.json();

    const { data: vault, error } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (!vault || error) {
      console.error('Vault fetch error:', error);
      return new Response('Vault not found', { status: 404 });
    }

    const systemPrompt = formatVaultPrompt(vault);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const reply = completion.choices[0]?.message?.content || 'No response.';
    return new Response(reply);
  } catch (err: any) {
    console.error('[CHAT ERROR]', err);
    return new Response(`Server Error: ${err.message}`, { status: 500 });
  }
}
    