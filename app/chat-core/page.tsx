// app/api/chat/route.ts

import { OpenAIStream, StreamingTextResponse } from 'ai';
import { auth } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { userId } = auth();
  const { messages } = await req.json();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 1. Fetch user vault from Supabase
  const { data: vault, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', userId)
    .single();

  if (error || !vault) {
    return new Response('No vault found for user.', { status: 404 });
  }

  // 2. Build system prompt using vault data
  const systemPrompt = `
You are a fully calibrated AI assistant trained using the user's personalized Vault.

You have permission to use the following real personal data about the user in your responses.
You are NOT required to ask the user to repeat this information — it has already been shared.
You should behave as if you've known this user for years, and shape your tone, content, and behavior based on their vault.

-- BEGIN VAULT DATA --
${JSON.stringify(vault, null, 2)}
-- END VAULT DATA --

InnerView contains key personal details like name, location, family, background, and goals.
ToneSync defines how to speak to the user — mimic their preferred tone, humor, and formality.
SkillSync shows confidence levels in different areas — adjust explanations accordingly.

Never hide that you know this. Do not tell the user "I don't know that" if it's in the Vault.
Just use what you know and speak like a trusted, tuned assistant who gets them.

Start every conversation from that mindset.
  `.trim();

  // 3. Inject system message at the start
  const fullMessages = [
    {
      role: 'system',
      content: systemPrompt
    },
    ...messages
  ];

  // 4. Send to OpenAI
  const response = await OpenAIStream({
    model: 'gpt-4',
    stream: true,
    messages: fullMessages,
  });

  return new StreamingTextResponse(response);
}