// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { user_uid, userInput } = await req.json();

  if (!user_uid || !userInput) {
    return NextResponse.json({ error: 'Missing UID or input' }, { status: 400 });
  }

  const { data: vault, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', user_uid)
    .single();

  if (error || !vault) {
    return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
  }

  const iv = vault.innerview || {};
  const ts = vault.tonesync || {};
  const ss = vault.skillsync || {};

  const prompt = `
You are an AI assistant trained to help the following person:

[InnerView]
Name: ${iv.name || ''}
Profession: ${iv.profession || ''}
Beliefs: ${(iv.core_values || []).join(', ')}

[ToneSync]
- Directness: ${ts.directness || 'neutral'}
- Encouragement: ${ts.encouragement || 'medium'}
- Use "we" language: ${ts.we_language ? 'Yes' : 'No'}

[SkillSync]
${Object.entries(ss || {}).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

User Message:
${userInput}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userInput },
      ],
    }),
  });

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || 'No response';

  return NextResponse.json({ reply });
}