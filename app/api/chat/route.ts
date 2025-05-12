import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID,
});

export async function POST(req: Request) {
  try {
    const { messages, vault } = await req.json();

    const systemMessage = {
      role: 'system',
      content: `You are a helpful assistant trained to reflect the user's preferences.${
        vault?.tone_preference ? ` Use a tone like: ${vault.tone_preference}.` : ''
      }`,
    };

    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...messages],
    });

    return NextResponse.json({
      reply: response.choices[0].message.content,
    });
  } catch (error: any) {
    console.error('[CHAT ERROR]', error?.error || error?.message || error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}