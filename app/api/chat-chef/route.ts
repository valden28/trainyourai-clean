// ✅ File: /app/api/chat-chef/route.ts

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import buildChefPrompt from '@/lib/assistants/chefPromptBuilder';
import { handleChefIntent } from '@/lib/chef/handleChefIntent';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req, NextResponse.next());
    const userId = session?.user?.sub;
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const { messages } = await req.json();
    const userMessage = messages[messages.length - 1]?.content || '[Empty]';

    // 🧠 Check for intent before OpenAI call
    const intentResult = await handleChefIntent({
      sender_uid: userId,
      receiver_uid: userId,
      message: userMessage
    });

    if (intentResult?.status !== 'ignored') {
      console.log('[CHEF INTENT RESPONSE]', intentResult);
      return NextResponse.json({
        role: 'assistant',
        name: 'chefCarlo',
        content: intentResult.message || '✅ Handled vault intent.'
      });
    }

    // 📦 Load full user vault
    const { data: vault, error: vaultError } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (!vault || vaultError) {
      console.error('❌ Vault lookup failed:', vaultError?.message);
      return new NextResponse('Vault not found', { status: 404 });
    }

    // ✨ Generate system prompt
    const systemPrompt = await buildChefPrompt(userMessage, vault);
    console.log('[CHEF DEBUG] System Prompt:', systemPrompt);

    // 🤖 Generate assistant reply
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });

    const reply = completion.choices[0]?.message?.content || '[No reply]';
    console.log('[CHEF DEBUG] OpenAI Reply:', reply);

    // 🧾 Try to extract title from reply for vault tracking
    const titleLine = reply.split('\n')[0];
    const titleGuess = titleLine.replace(/^📬/, '').trim();
    const fallbackKey = titleGuess.toLowerCase().replace(/[^a-z0-9]/gi, '');

    // 💾 Insert into pending_recipes table
    const { error: insertError } = await supabase.from('pending_recipes').insert({
      user_uid: userId,
      content: reply,
      recipe_title: titleGuess || 'Untitled Recipe',
      recipe_key: fallbackKey || 'untitled'
    });

    if (insertError) {
      console.error('❌ Failed to insert pending recipe:', insertError.message);
    } else {
      console.log('✅ Pending recipe stored with title:', titleGuess);
    }

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