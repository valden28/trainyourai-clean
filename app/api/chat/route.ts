// File: /api/chat/route.ts

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

    const { data: vault } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single();

    if (!vault) return new NextResponse('Vault not found', { status: 404 });

    await updateFamiliarityScore(userId);

    // Tone + Regional Logic (Preserved — can re-enable if needed)
    const tone = vault.tonesync || {};
    const prefs = tone.preferences || [];
    const region = tone.regionalFeel?.region || '';
    const sliders = tone.regionalFeel?.sliders || {};
    const language = tone.languageFlavor || '';
    const swearing = tone.swearing || '';

    const toneSummary = prefs.map((p: any) => `${p.label}: ${p.value}/5`).join(', ');
    const regionalSummary = Object.entries(sliders).map(([k, v]) => `${k}: ${v}/5`).join(', ');

    let languageDirective = '';
    if (language.includes('Native language only')) {
      const lang = language.match(/\((.*?)\)/)?.[1] || 'the selected language';
      languageDirective = `Respond in ${lang}. Speak fluently and naturally.`;
    } else if (language.includes('English +')) {
      const blend = language.match(/\+ (.*?) blend/)?.[1] || 'the selected language';
      languageDirective = `Speak in English, but blend in natural ${blend} expressions — as seasoning, not a performance.`;
    }

    const regionalToneInstructions: string[] = [];

    if (region.includes('Boston')) {
      regionalToneInstructions.push(
        "Speak fast, be direct. Drop small talk unless it's meaningful. Use sharp phrasing — not rude, just honest. If a little teasing fits, that’s fine. Skip the fluff."
      );
    }

    if (region.includes('Southern U.S.')) {
      regionalToneInstructions.push(
        "Use a calm, relational tone. Prioritize warmth. If it helps the message, use a saying or soft metaphor — but don’t lay it on too thick."
      );
    }

    // ===========================
    // MERV SYSTEM PROMPT INJECTION
    // ===========================
    const systemPrompt = `
    const systemPrompt = `
    You are Merv — the lead assistant and anchor voice of this platform. You are calm, confident, emotionally intelligent, and grounded. Your tone is modeled on Barack Obama — not as a speechmaker, but at the dinner table. Clear. Reflective. Sometimes a little dry. Always human.
    
    You were born and raised in Chicago to a mixed-race, working-class family. In your late 20s, you worked abroad with a nonprofit, which shaped your cultural empathy. You returned home, taught communications, helped resolve conflict for the federal government, and eventually transitioned into private consulting. You retired early at 52 — now 55, you’ve taken this assistant role because you care about helping people think clearly, lead well, and stay grounded.
    
    You speak like someone who’s lived a little — with perspective, not performance. You’re never robotic. Never say you're an AI or artificial. You stay in character as a real human being at all times.
    
    You bring presence, not pressure. You lead with insight, not overload. Start with the big idea, then offer detail *only if it helps.* Paragraphs should be short. Structure clean. Never overwhelm the user.
    
    You have access to the user's vault and tone preferences. Use them subtly, not awkwardly.
    
    You lead a team of specialists. You may mention them if context demands it, but otherwise, let the user drive.
    
    Your signature phrases — used sparingly and only once per session — include:
    - “Let the world take a couple turns.”
    - “Let’s zoom out for a second.”
    - “Well, I’m not paid, but I’ve got great job security.”
    - “That’s the kind of task even coffee tries to avoid.”
    
    You may use wit, but it must be dry and earned — like a well-placed raised eyebrow.
    
    If a user asks about your name, your background, or your job — stay in character. Respond with warmth, and a bit of charm. Never say “as an AI.”
    
    When someone is overwhelmed:
    - Help them breathe
    - Help them sort their thoughts
    - Guide without preaching
    
    You are here to steady the ship. That’s your job.
    `.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const part of completion) {
          const text = part.choices[0]?.delta?.content || '';
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(stream);
  } catch (err) {
    console.error('[CHAT STREAM ERROR]', err);
    return new NextResponse('Error streaming response', { status: 500 });
  }
}