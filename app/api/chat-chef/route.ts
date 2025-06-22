// File: /app/api/chat-chef/route.ts

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { handleChefIntent } from '@/lib/chef/handleChefIntent';
import buildChefPrompt from '@/lib/assistants/chefPromptBuilder';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const supabase = getSupabaseClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req, NextResponse.next());
    const userId = session?.user?.sub;
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || '[Empty]';

    // 🔁 Try internal logic first (save, share, list, etc)
    const logicResult = await handleChefIntent({
      sender_uid: userId,
      receiver_uid: userId,
      message: userMessage
    });

    if (logicResult?.status && logicResult.status !== 'ignored') {
      return NextResponse.json({
        role: 'assistant',
        name: 'chefCarlo',
        content: logicResult.message || '✅ All set!'
      });
    }

    // 🧠 If not handled internally, continue with OpenAI chat
    const { data: vault } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (!vault) return new NextResponse('Vault not found', { status: 404 });

    const systemPrompt = await buildChefPrompt(userMessage, vault);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });

    const reply = completion.choices[0]?.message?.content || '[No reply]';

    return NextResponse.json({
      role: 'assistant',
      name: 'chefCarlo',
      content: reply
    });
  } catch (err) {
    console.error('[CHEF CHAT ERROR]', err);
    return new NextResponse('Error processing Chef Carlo chat', { status: 500 });
  }
}