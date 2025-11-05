// ✅ File: /app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs'; // use Node so env works reliably
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// basic detector; you can improve later
const CONTACT_INTENT = /(phone|number|email|contact|reach|call|text)/i;

// extract a probable person name (simple heuristic)
function extractName(s: string) {
  const m = s.match(/for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  if (m?.[1]) return m[1].trim();
  const cap = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})$/);
  return cap?.[1]?.trim();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) return NextResponse.json({ error: 'Missing messages' }, { status: 400 });

    const userMessage: string = messages[messages.length - 1]?.content || '';

    // ---------- vault & tenant ----------
    const { data: vault, error: vErr } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', user_uid)
      .single();
    if (vErr || !vault) return NextResponse.json({ error: 'Vault not found' }, { status: 404 });

    const tenant_id: string | null = vault.tenant_id || null;

    // ---------- Merv persona ----------
    const { data: brain } = await supabase
      .from('merv_brain')
      .select('prompt')
      .eq('user_uid', user_uid)
      .maybeSingle();
    const basePersona = brain?.prompt || 'You are Merv — grounded, sharp, calibrated.';

    // ---------- CONTACTS LOOKUP ----------
    let contactsContext = '';
    let directAnswer: string | null = null;

    if (tenant_id && CONTACT_INTENT.test(userMessage)) {
      const qName = extractName(userMessage) || userMessage;
      const like = `%${qName}%`;

      const { data: hits } = await supabase
        .from('contacts')
        .select('id,full_name,email,phone,location')
        .eq('tenant_id', tenant_id)
        .eq('owner_uid', user_uid)
        .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
        .limit(5);

      if (hits && hits.length) {
        // Build ContactsContext
        const lines = hits.map(c =>
          `- ${c.full_name || ''}${c.location ? ` (${c.location})` : ''}` +
          `${c.email ? ` | email: ${c.email}` : ''}` +
          `${c.phone ? ` | phone: ${c.phone}` : ''}`
        ).join('\n');
        contactsContext = `\nContactsContext:\n${lines}\n`;

        // OPTIONAL: if exactly one match and both fields exist, we can short-circuit (bypass model)
        if (hits.length === 1 && (hits[0].email || hits[0].phone)) {
          const e = hits[0].email ? `Email: ${hits[0].email}` : '';
          const p = hits[0].phone ? `Phone: ${hits[0].phone}` : '';
          directAnswer = `${hits[0].full_name}\n${[e, p].filter(Boolean).join(' · ')}`;
        }
      }
    }

    if (directAnswer) {
      return NextResponse.json({ role: 'assistant', name: 'Merv', content: directAnswer });
    }

    // ---------- policy add-on so Merv is allowed when ContactsContext exists ----------
    const contactsPolicy = `
Contacts & Personal Info (policy)
- You may provide phone numbers or emails ONLY if they are present in ContactsContext (these are the user's own contacts).
- If ContactsContext is missing or empty, refuse and offer to add a contact via the contacts API.
    `.trim();

    // ---------- build prompt ----------
    const vaultSummary = generateVaultSummary(vault);
    const systemPrompt = `
User Profile Summary:
${vaultSummary}

${basePersona}

${contactsPolicy}
${contactsContext}
`.trim();

    const trimmed = messages.slice(-10);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        ...trimmed,
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || '';
    return NextResponse.json({ role: 'assistant', name: 'Merv', content: reply });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    return NextResponse.json(
      { role: 'assistant', name: 'Merv', content: `Error: ${err.message}` },
      { status: 500 }
    );
  }
}
