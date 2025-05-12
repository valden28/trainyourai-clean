// app/chat-core/page.tsx
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, vault } = await req.json();

    // Optional: include vault values in a system prompt
    const systemMessage = {
      role: 'system',
      content: `You are a helpful assistant trained to respond using the user's personal preferences. ${
        vault?.tone_preference
          ? `Use a tone like: ${vault.tone_preference}.`
          : ''
      }`,
    };

    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemMessage, ...messages],
    });

    return NextResponse.json({
      reply: openaiResponse.choices[0].message.content,
    });
  } catch (error: any) {
    console.error('[CHAT ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}