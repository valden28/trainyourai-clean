// ✅ File: /app/api/chat-chef/route.ts

import { getSession } from '@auth0/nextjs-auth0/edge';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import buildChefPrompt from '@/lib/assistants/chefPromptBuilder';
import { handleChefIntent } from '@/lib/chef/handleChefIntent';

// Initialize OpenAI once per edge/server runtime
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    // --- Auth ---------------------------------------------------------------
    const session = await getSession(req, NextResponse.next());
    const userId = session?.user?.sub;
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: missing user session.' },
        { status: 401 }
      );
    }

    // --- Parse input --------------------------------------------------------
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const userMessage =
      messages[messages.length - 1]?.content?.trim() || '[Empty message]';

    // --- 1️⃣  Check for vault intent ----------------------------------------
    const intentResult = await handleChefIntent({
      sender_uid: userId,
      receiver_uid: userId,
      message: userMessage,
    });

    if (intentResult?.status && intentResult.status !== 'ignored') {
      console.log('[CHEF INTENT RESPONSE]', intentResult);
      return NextResponse.json({
        role: 'assistant',
        name: 'chefCarlo',
        content: intentResult.message || '✅ Handled vault intent.',
      });
    }

    // --- 2️⃣  Pull vault context --------------------------------------------
    const { data: vault, error: vaultError } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (vaultError || !vault) {
      console.error('❌ Vault lookup failed:', vaultError?.message);
      return NextResponse.json(
        { error: 'Vault not found or lookup failed.' },
        { status: 404 }
      );
    }

    // --- 3️⃣  Build system prompt -------------------------------------------
    const systemPrompt = await buildChefPrompt(userMessage, vault);
    console.log('[CHEF DEBUG] System Prompt:', systemPrompt);

    // --- 4️⃣  OpenAI completion ---------------------------------------------
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const reply = completion.choices[0]?.message?.content || '[No reply]';
    console.log('[CHEF DEBUG] OpenAI Reply:', reply);

    // --- 5️⃣  Extract recipe title ------------------------------------------
    const titleMatch = reply.match(/^\s*(?:📬)?\s*(.+?)\s*(?:\n|$)/);
    const rawTitle = titleMatch?.[1]?.trim();
    const cleanTitle =
      rawTitle?.replace(/^["']|["']$/g, '') || 'Untitled Recipe';
    const cleanKey =
      cleanTitle.toLowerCase().replace(/[^a-z0-9]/gi, '') || 'untitled';

    // --- 6️⃣  Save to pending_recipes --------------------------------------
    const { error: insertError } = await supabase.from('pending_recipes').insert({
      user_uid: userId,
      content: reply,
      recipe_title: cleanTitle,
      recipe_key: cleanKey,
    });

    if (insertError) {
      console.error('❌ Failed to insert pending recipe:', insertError.message);
    } else {
      console.log('✅ Stored pending recipe as:', cleanTitle);
    }

    // --- 7️⃣  Return final message ------------------------------------------
    return NextResponse.json({
      role: 'assistant',
      name: 'chefCarlo',
      content: reply,
    });
  } catch (err: any) {
    console.error('[CHEF CHAT ERROR]', err);
    return NextResponse.json(
      {
        role: 'assistant',
        name: 'chefCarlo',
        content: `Sorry, I encountered an error while processing your request: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
