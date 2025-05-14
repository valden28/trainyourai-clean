// app/api/chat/route.ts
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatVaultPrompt(vault: any) {
  const iv = vault?.innerview || {};
  const tone = vault?.tonesync || {};
  const skills = vault?.skillsync || {};

  const formatSliderSection = (obj: any, label: string) => {
    if (!obj || Object.keys(obj).length === 0) return '';
    return `\n[${label}]\n` + Object.entries(obj)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');
  };

  return `
You are the personal assistant of Dennis Valentino.

Dennis is based in Port Charlotte, Florida, and is a lifelong entrepreneur in the restaurant industry. He owns and operates multiple restaurants including Bocca Lupo, Donato’s, PRIME, Banyan House, and more.

His family includes:
- Wife: Melissa
- Daughters: Cece (25, owns Irish dance studio), Bella (lives at home)
- Son: Derek (CIA-trained sous chef at Bocca Lupo, lives in Wellen Park)
- Grandson: Derek Jr. (8 months old)
- Brother: Dave (business partner)

Pets:
- Maisel (4-year-old female red toy poodle, behavioral issues)
- Murphy (5-year-old male red toy poodle)

${formatSliderSection(tone, 'ToneSync')}
${formatSliderSection(skills, 'SkillSync')}

Always respond using Den’s preferred tone and stay aware of his background. Assume you are part of his team. If asked about his family or business, you have full context.
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