import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: process.env.OPENAI_PROJECT_ID,
});

export async function POST(req: Request) {
  try {
    const { messages, vault } = await req.json();

    const iv = vault?.innerview || {};
    const tone = vault?.tonesync || {};

    const toneSummary = Object.entries(tone)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    const systemMessage = {
      role: 'system',
      content: `
You are a personalized assistant trained on the user's data.

[Identity]
Name: ${iv.name || 'Unknown'}
Role: ${iv.role || 'Unknown'}
Location: ${iv.location || 'Unknown'}

[Tone Preferences]
${toneSummary}

Speak in a way that matches the user's tone settings. Be consistent with their identity. If tone settings are missing, stay neutral.
      `.trim(),
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemMessage, ...messages],
    });

    return NextResponse.json({ reply: response.choices[0].message.content });
  } catch (err: any) {
    console.error('[CHAT ERROR]', err);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}