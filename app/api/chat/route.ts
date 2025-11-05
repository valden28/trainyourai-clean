// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ---------- helpers ----------

// Accept only 'user' | 'assistant' and non-empty string content
function sanitizeHistory(input: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => {
      const rawRole = (m.role || '').toString().toLowerCase();
      const role: 'user' | 'assistant' = rawRole === 'assistant' ? 'assistant' : 'user';
      return { role, content: m.content.trim() };
    });
}

// simple detection (fast + robust)
const CONTACT_INTENT = /(phone|number|email|contact|reach|call|text)\b/i;
const SALES_INTENT   = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;

// extract a probable person name (best-effort heuristic)
function extractName(s: string) {
  // try "for Stacy Jones"
  const m = s.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  if (m?.[1]) return m[1].trim();
  // else last 1–3 capitalized words
  const cap = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})$/);
  return cap?.[1]?.trim();
}

// parse a date like "2025-10-28", "10/28/25", "Oct 28", "October 28, 2025"
function parseDateSmart(s: string): string | null {
  // ISO or yyyy-mm-dd
  const iso = s.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];

  // mm/dd[/yy]
  const us = s.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (us) {
    const mm = Number(us[1]);
    const dd = Number(us[2]);
    let yy = us[3] ? Number(us[3]) : new Date().getFullYear();
    if (yy < 100) yy += 2000; // 25 -> 2025
    const dt = new Date(yy, mm - 1, dd);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  // Month name
  const months = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  const rx = new RegExp(`\\b(${months.join('|')})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\b`, 'i');
  const nm = s.match(rx);
  if (nm) {
    const monthIdx = months.indexOf(nm[1].toLowerCase());
    const day = Number(nm[2]);
    const year = nm[3] ? Number(nm[3]) : new Date().getFullYear();
    const dt = new Date(year, monthIdx, day);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  return null;
}

// default Banyan location id (you can swap to dynamic later)
const BANYAN_LOCATION_ID = '2da9f238-3449-41db-b69d-bdbd357dd496';

// ---------- route ----------

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Body / messages
    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.messages) ? body.messages : [];
    const history = sanitizeHistory(incoming);
    if (history.length === 0) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
    }
    const lastUserMsg = history.slice().reverse().find((m) => m.role === 'user')?.content || '';

    // Vault (for summary + tenant)
    const { data: vault } = await supabase
      .from('vaults_test')
      .select('*')
      .eq('user_uid', user_uid)
      .single();
    if (!vault) return NextResponse.json({ error: 'Vault not found' }, { status: 404 });

    const tenant_id: string | null = vault.tenant_id || null;

    // Persona
    const { data: brain } = await supabase
      .from('merv_brain')
      .select('prompt')
      .eq('user_uid', user_uid)
      .maybeSingle();
    const basePersona = brain?.prompt || 'You are Merv — grounded, sharp, calibrated.';

    // ---------- DYNAMIC CONTEXTS ----------
    let contactsContext = '';
    let salesContext = '';

    // CONTACTS
    if (tenant_id && CONTACT_INTENT.test(lastUserMsg)) {
      const qName = extractName(lastUserMsg) || lastUserMsg;
      const like = `%${qName}%`;
      const { data: hits } = await supabase
        .from('contacts')
        .select('full_name,email,phone,location')
        .eq('tenant_id', tenant_id)
        .eq('owner_uid', user_uid)
        .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
        .limit(5);

      if (hits && hits.length) {
        const lines = hits.map((c) =>
          `- ${c.full_name || ''}${c.location ? ` (${c.location})` : ''}` +
          `${c.email ? ` | email: ${c.email}` : ''}` +
          `${c.phone ? ` | phone: ${c.phone}` : ''}`
        ).join('\n');
        contactsContext = `\nContactsContext:\n${lines}\n`;
      }
    }

    // DAILY SALES
    if (SALES_INTENT.test(lastUserMsg)) {
      const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0, 10);
      const { data: rows } = await supabase
        .from('sales_daily')
        .select('work_date, net_sales, bar_sales, comps, voids, total_tips, deposit')
        .eq('work_date', d)
        .eq('location_id', BANYAN_LOCATION_ID)
        .limit(1);
      if (rows && rows.length) {
        const s = rows[0];
        salesContext = `
SalesContext:
- date: ${s.work_date}
- net_sales: ${s.net_sales}
- bar_sales: ${s.bar_sales}
- comps: ${s.comps}
- voids: ${s.voids}
- total_tips: ${s.total_tips}
- deposit: ${s.deposit}
`.trim();
      }
    }

    // ---------- Contacts policy add-on ----------
    const contactsPolicy = `
Contacts & Personal Info (policy)
- You may provide phone numbers or emails ONLY if they are present in ContactsContext (these come from the user's contacts).
- If ContactsContext is missing or empty, refuse and offer to add a contact via the contacts API.
    `.trim();

    // System prompt build
    const vaultSummary = generateVaultSummary(vault);
    const systemPrompt = `
User Profile Summary:
${vaultSummary}

${basePersona}

${contactsPolicy}
${contactsContext}
${salesContext}
`.trim();

    // Optional assistant primer to keep answers tight
    const primer: { role: 'assistant'; content: string } = {
      role: 'assistant',
      content:
        'Understood. I will answer with an executive summary, an action list, and concise watch-outs as needed.',
    };

    // Trim to last N messages
    const trimmed = history.slice(-10);

    // Model call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        primer,
        ...trimmed,
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || '[No reply]';
    return NextResponse.json({ role: 'assistant', name: 'Merv', content: reply });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    return NextResponse.json(
      { role: 'assistant', name: 'Merv', content: `Error: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}
