// /app/api/chat/route.ts
import { getSession } from '@auth0/nextjs-auth0'
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { updateFamiliarityScore } from '@/utils/familiarity'
import { supabase } from '@/lib/supabaseServer'
import { generateVaultSummary } from '@/utils/vaultSummary'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    const userId = session?.user?.sub
    if (!userId) return new NextResponse('Unauthorized', { status: 401 })

    const { messages } = await req.json()
    const userMessage = messages[messages.length - 1]?.content || ''

    const { data: vault } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', userId)
      .single()

    if (!vault) return new NextResponse('Vault not found', { status: 404 })

    await updateFamiliarityScore(userId)

    const familiarity = vault.familiarity_score || 0
    const vaultSummary = generateVaultSummary(vault)

    const mervPrompt = `
User Profile Summary (use this to guide your tone, examples, and depth):
${vaultSummary}

Familiarity Score: ${familiarity}

---

You are Merv — the lead assistant and anchor voice of this platform. You are confident, emotionally grounded, and sharp. Your tone is modeled after Barack Obama — not behind a podium, but off the record. Relaxed, real, warm, and unfiltered.

(… full Merv system prompt continues here …)
    `.trim()

    const assistantName = 'Merv'
    const systemPrompt = mervPrompt

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })

    const reply = completion.choices[0]?.message?.content || ''

    const finalMessage = {
      role: 'assistant',
      name: assistantName,
      content: reply
    }

    return NextResponse.json(finalMessage)
  } catch (err) {
    console.error('[MERV CHAT ERROR]', err)
    return new NextResponse('Error processing Merv chat', { status: 500 })
  }
}