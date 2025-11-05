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

// Intents
const CONTACT_INTENT = /(phone|number|email|contact|reach|call|text)\b/i;
const SALES_INTENT   = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;

// ---- Robust name extractor ----
// Finds the most likely 1–3 word proper name anywhere in the sentence.
// Handles: “can you give me Stacy Jones phone number”
function extractName(s: string): string | null {
  if (!s) return null;

  // prefer "for NAME" pattern when present
  const mFor = s.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (mFor?.[1]) return mFor[1].trim();

  // collect all capitalized chunks (1–3 words)
  const all = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g) || [];

  // blacklist obvious non-names
  const blacklist = new Set(
    ['I', 'Phone', 'Number', 'Email', 'Sales', 'Report', 'Manager', 'Chef', 'Merv', 'Luna'].map(t => t.trim())
  );

  // dedupe, drop blacklisted, pick the longest chunk near the end
  const candidates = Array.from(new Set(all))
    .map(t => t.trim())
    .filter(t => !blacklist.has(t))
    .sort((a, b) => b.split(' ').length - a.split(' ').length);

  return candidates[0] || null;
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

// Correct Banyan House location id
const BANYAN_LOCATION_ID = '2da9f238-3449-41db-b69d-bdbd357d6496';

// ---------- route ----------

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Body: support {messages:[...]} and {message:"..."}
    const raw = await req.text();
    let parsed: any = {};
    try { parsed = raw ? JSON.parse(raw) : {}; } catch { parsed = {}; }

    let history = sanitizeHistory(Array.isArray(parsed?.messages) ? parsed.messages : []);
    if (!history.length && typeof parsed?.message === 'string' && parsed.message.trim()) {
      history = [{ role: 'user', content: parsed.message.trim() }];
    }
    if (!history.length) {
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

    // ===== CONTACTS (with robust name + retry) =====
    if (tenant_id && CONTACT_INTENT.test(lastUserMsg)) {
      // First pass: try robust name
      let qName = extractName(lastUserMsg) || lastUserMsg;
      let like = `%${qName}%`;

      let { data: hits } = await supabase
        .from('contacts')
        .select('id,full_name,email,phone,location')
        .eq('tenant_id', tenant_id)
        .eq('owner_uid', user_uid)
        .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
        .limit(5);

      // Second chance: strip common words and retry if nothing found
      if (!hits?.length) {
        const cleaned = lastUserMsg
          .replace(/(phone|number|email|contact|reach|call|text)\b/gi, '')
          .replace(/[^\w' ]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (cleaned && cleaned !== lastUserMsg) {
          like = `%${cleaned}%`;
          const retry = await supabase
            .from('contacts')
            .select('id,full_name,email,phone,location')
            .eq('tenant_id', tenant_id)
            .eq('owner_uid', user_uid)
            .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
            .limit(5);
          hits = retry.data || [];
        }
      }

      // If we found a contact, return it immediately (no OpenAI polish)
      if (hits && hits.length) {
        const c = hits[0];
        const lines = [
          `${c.full_name}${c.location ? ` — ${c.location}` : ''}`,
          c.email ? `Email: ${c.email}` : null,
          c.phone ? `Phone: ${c.phone}` : null,
        ].filter(Boolean);
        const directAnswer = lines.join('\n');

        // Also include a context block for continuity if you still send to OpenAI later
        const ctxLines = hits.map((h) =>
          `- ${h.full_name}${h.location ? ` (${h.location})` : ''}${h.email ? ` | email: ${h.email}` : ''}${h.phone ? ` | phone: ${h.phone}` : ''}`
        );
        contactsContext = `\nContactsContext:\n${ctxLines.join('\n')}\n`;

        // Early return so there’s no chance of model “safety” refusing
        return NextResponse.json({
          text: directAnswer,
          role: 'assistant',
          name: 'Merv',
          content: directAnswer,
          meta: { intent: 'contacts', hits },
        });
      }
    }

    // ===== DAILY SALES =====
    if (SALES_INTENT.test(lastUserMsg)) {
      const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0, 10);

      // Prefer daily_sales if present (adjust column names to yours)
      let salesRow: any = null;

      // Try daily_sales
      const tryDaily = await supabase
        .from('daily_sales')
        .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
        .eq('date', d)
        .eq('location_id', BANYAN_LOCATION_ID)
        .limit(1);
      if (tryDaily.data && tryDaily.data.length) salesRow = tryDaily.data[0];

      // Fallback to sales_daily if needed
      if (!salesRow) {
        const tryLegacy = await supabase
          .from('sales_daily')
          .select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit')
          .eq('work_date', d)
          .eq('location_id', BANYAN_LOCATION_ID)
          .limit(1);
        if (tryLegacy.data && tryLegacy.data.length) {
          const s = tryLegacy.data[0];
          salesRow = {
            date: s.work_date,
            net_sales: s.net_sales,
            bar_sales: s.bar_sales,
            total_tips: s.total_tips,
            comps: s.comps,
            voids: s.voids,
            deposit: s.deposit,
          };
        }
      }

      if (salesRow) {
        const s = salesRow;
        const txt =
          `Sales for ${s.date}:\n` +
          `- Net Sales: $${Number(s.net_sales || 0).toFixed(2)}\n` +
          `- Bar Sales: $${Number(s.bar_sales || 0).toFixed(2)}\n` +
          (s.comps != null ? `- Comps: ${s.comps}\n` : '') +
          (s.voids != null ? `- Voids: ${s.voids}\n` : '') +
          (s.total_tips != null ? `- Total Tips: $${Number(s.total_tips || 0).toFixed(2)}\n` : '') +
          (s.deposit != null ? `- Deposit: $${Number(s.deposit || 0).toFixed(2)}\n` : '');

        // Early return (no need to ask OpenAI to rewrite)
        return NextResponse.json({
          text: txt.trim(),
          role: 'assistant',
          name: 'Merv',
          content: txt.trim(),
          meta: { intent: 'sales', date: s.date },
        });
      }

      // No sales row found — let OpenAI respond later with a helpful message
    }

    // ---------- Contacts policy add-on ----------
    const contactsPolicy = `
Contacts & Personal Info (policy)
- You may provide phone numbers or emails ONLY if they are present in ContactsContext (these come from the user's internal contacts).
- If ContactsContext is missing or empty, ask if they'd like you to add the contact.
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

    // Model call (used for everything else)
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

    // Return in both shapes so any frontend can display it
    return NextResponse.json({
      text: reply,
      role: 'assistant',
      name: 'Merv',
      content: reply,
    });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    return NextResponse.json(
      {
        text: `Error: ${err?.message || String(err)}`,
        role: 'assistant',
        name: 'Merv',
        content: `Error: ${err?.message || String(err)}`,
      },
      { status: 500 }
    );
  }
}
