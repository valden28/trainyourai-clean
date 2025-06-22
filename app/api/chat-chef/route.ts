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

    // Check for vault intent first
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

    // Get full vault for context
    const { data: vault, error: vaultError } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (!vault || vaultError) {
      console.error('❌ Vault lookup failed:', vaultError?.message);
      return new NextResponse('Vault not found', { status: 404 });
    }

    // Build system prompt
    const systemPrompt = await buildChefPrompt(userMessage, vault);
    console.log('[CHEF DEBUG] System Prompt:', systemPrompt);

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    });

    const reply = completion.choices[0]?.message?.content || '[No reply]';
    console.log('[CHEF DEBUG] OpenAI Reply:', reply);

    // Try to extract recipe title
    const titleMatch = reply.match(/^\s*(?:📬)?\s*(.+?)\s*(?:\n|$)/);
    const rawTitle = titleMatch?.[1]?.trim();
    const cleanTitle = rawTitle?.replace(/^["']|["']$/g, '') || 'Untitled Recipe';
    const cleanKey = cleanTitle.toLowerCase().replace(/[^a-z0-9]/gi, '') || 'untitled';

    // Save to pending_recipes
    const { error: insertError } = await supabase.from('pending_recipes').insert({
      user_uid: userId,
      content: reply,
      recipe_title: cleanTitle,
      recipe_key: cleanKey
    });

    if (insertError) {
      console.error('❌ Failed to insert pending recipe:', insertError.message);
    } else {
      console.log('✅ Stored pending recipe as:', cleanTitle);
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