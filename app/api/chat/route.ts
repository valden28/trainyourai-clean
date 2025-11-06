   // app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs';

const DEBUG_LOG = true; // toggle to false later
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ──────────────────────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────────────────────── */

function sanitizeHistory(input: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => {
      const r = (m.role || '').toString().toLowerCase();
      const role: 'user' | 'assistant' = r === 'assistant' ? 'assistant' : 'user';
      return { role, content: m.content.trim() };
    });
}

// intent detectors
const CONTACT_INTENT = /(phone|number|email|contact|reach|call|text)\b/i;
const SALES_INTENT   = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;

// robust proper-name extractor (finds last prominent 1–3 word capitalized name)
function extractName(s: string): string | null {
  if (!s) return null;

  // Prefer “for NAME …”
  const mFor = s.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (mFor?.[1]) return mFor[1].trim();

  // Collect all 1–3 word capitalized chunks
  const all = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g) || [];

  // Blacklist obvious non-names
  const blacklist = new Set(
    ['I','Phone','Number','Email','Sales','Report','Manager','Chef','Merv','Luna'].map(t=>t.trim())
  );

  // De-dupe and pick the longest chunk
  const candidates = Array.from(new Set(all))
    .map(t => t.trim())
    .filter(t => !blacklist.has(t))
    .sort((a,b)=> b.split(' ').length - a.split(' ').length);

  return candidates[0] || null;
}

// parse common date formats
function parseDateSmart(s: string): string | null {
  const iso = s.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];

  const us = s.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (us) {
    const mm = Number(us[1]);
    const dd = Number(us[2]);
    let yy = us[3] ? Number(us[3]) : new Date().getFullYear();
    if (yy < 100) yy += 2000;
    const dt = new Date(yy, mm - 1, dd);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  const months = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  const rx = new RegExp(`\\b(${months.join('|')})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\b`,'i');
  const nm = s.match(rx);
  if (nm) {
    const idx = months.indexOf(nm[1].toLowerCase());
    const day = Number(nm[2]);
    const year = nm[3] ? Number(nm[3]) : new Date().getFullYear();
    const dt = new Date(year, idx, day);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }

  return null;
}

// Correct Banyan House location UUID
const BANYAN_LOCATION_ID = '2da9f238-3449-41db-b69d-bdbd357d6496';

/* ──────────────────────────────────────────────────────────────────────────────
   Route
────────────────────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Body: accept {messages:[...]} or {message:"..."}
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
    const lastUserMsg = history.slice().reverse().find(m=>m.role==='user')?.content || '';
    if (DEBUG_LOG) console.log('[MERV DEBUG] lastUserMsg:', lastUserMsg);
 
     // Vault (tenant + summary)
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

    /* ──────────────────────────────────────────────────────────────────────
       EMPLOYEES lookup (robust, early return, no model)
    ─────────────────────────────────────────────────────────────────────── */

    let contactsContext = '';
    if (tenant_id && CONTACT_INTENT.test(lastUserMsg)) {
      const rawName = extractName(lastUserMsg) || '';
      const cleanedBase = rawName && rawName.length >= 3 ? rawName : lastUserMsg;

      const norm = cleanedBase
        .replace(/(phone|number|email|contact|reach|call|text)\b/gi, '')
        .replace(/[’']/g, "'")
        .replace(/[^\w' ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const tokens = norm.split(' ').filter(t => t.length >= 2).slice(0, 3); // up to 3 words
      const likeAND = tokens.map(t => `full_name.ilike.%${t}%`).join(',');

      async function queryEmployees(orExpr: string, alsoLike?: string): Promise<any[]> {
        const orParts = [orExpr];
        if (alsoLike) orParts.push(`full_name.ilike.%${alsoLike}%`);
        if (tokens[0]) { orParts.push(`email.ilike.%${tokens[0]}%`); orParts.push(`phone.ilike.%${tokens[0]}%`); }
        if (tokens[1]) { orParts.push(`email.ilike.%${tokens[1]}%`); orParts.push(`phone.ilike.%${tokens[1]}%`); }

        // Use 'any' so TS doesn't complain when we change selection shape
        let resp: any = await supabase
          .from('employees')
          .select('id, full_name, first_name, last_name, email, phone, location_id, locations ( name )')
          .eq('tenant_id', tenant_id)
          .or(orParts.join(','))
          .limit(5);

        if (resp.error) {
          // Retry without join if join relation name differs
          resp = await supabase
            .from('employees')
            .select('id, full_name, first_name, last_name, email, phone, location_id')
            .or(orParts.join(','))
            .limit(5);
      
           if (DEBUG_LOG) console.log('[MERV DEBUG] employee intent triggered', { tenant_id, norm });
           if (hits?.length) console.log('[MERV DEBUG] employee hits', hits);
        }
        return resp.data ?? [];
      }

      // First pass — AND tokens on full_name
      let hits = await queryEmployees(likeAND);

      // Second pass — Stacy/Stacey loosen
      if (!hits.length && /stac/i.test(norm)) {
        const alt = norm.replace(/stac(i|ey)/i, 'stac%');
        hits = await queryEmployees(likeAND, alt);
      }

      // Third pass — whole cleaned string against full_name/email/phone
      if (!hits.length && norm) {
        let resp: any = await supabase
          .from('employees')
          .select('id, full_name, first_name, last_name, email, phone, location_id, locations ( name )')
          .eq('tenant_id', tenant_id)
          .or(`full_name.ilike.%${norm}%,email.ilike.%${norm}%,phone.ilike.%${norm}%`)
          .limit(5);
        if (resp.error) {
          resp = await supabase
            .from('employees')
            .select('id, full_name, first_name, last_name, email, phone, location_id')
            .or(`full_name.ilike.%${norm}%,email.ilike.%${norm}%,phone.ilike.%${norm}%`)
            .limit(5);
        }
        hits = resp.data ?? [];
      }

      if (hits.length) {
        const e: any = hits[0];
        const name =
          e.full_name ||
          [e.first_name, e.last_name].filter(Boolean).join(' ') ||
          'Unknown';

        const locName = Array.isArray(e.locations)
          ? e.locations?.[0]?.name
          : e.locations?.name;

        const lines = [
          `${name}${locName ? ` — ${locName}` : ''}`,
          e.email ? `Email: ${e.email}` : null,
          e.phone ? `Phone: ${e.phone}` : null,
        ].filter(Boolean);

        const directAnswer = lines.join('\n');

        const ctxLines = hits.map((h: any) => {
          const nm = h.full_name || [h.first_name, h.last_name].filter(Boolean).join(' ');
          const ln = Array.isArray(h.locations) ? h.locations?.[0]?.name : h.locations?.name;
          return `- ${nm}${ln ? ` (${ln})` : ''}${h.email ? ` | email: ${h.email}` : ''}${h.phone ? ` | phone: ${h.phone}` : ''}`;
        });
        contactsContext = `\nContactsContext:\n${ctxLines.join('\n')}\n`;

        return NextResponse.json({
          text: directAnswer,
          role: 'assistant',
          name: 'Merv',
          content: directAnswer,
          meta: { intent: 'employees', searched: norm, hits },
        });
      }

      const miss =
        (extractName(lastUserMsg) || tokens.join(' ') || 'that person');
      const notFound =
        `I couldn’t find ${miss} in employees. If you give me a phone or email, I can save it for next time.`;

      return NextResponse.json({
        text: notFound,
        role: 'assistant',
        name: 'Merv',
        content: notFound,
        meta: { intent: 'employees', searched: norm, hits: [] },
      });
    }

    /* ──────────────────────────────────────────────────────────────────────
       SALES (early return with formatted values)
    ─────────────────────────────────────────────────────────────────────── */

    let salesContext = '';
    if (SALES_INTENT.test(lastUserMsg)) {
      const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0, 10);

      let row: any = null;
      // Try daily_sales
      const tryDaily: any = await supabase
        .from('daily_sales')
        .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
        .eq('date', d)
        .eq('location_id', BANYAN_LOCATION_ID)
        .limit(1);
      if (tryDaily.data && tryDaily.data.length) row = tryDaily.data[0];

      // Fallback sales_daily
      if (!row) {
        const tryLegacy: any = await supabase
          .from('sales_daily')
          .select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit')
          .eq('work_date', d)
          .eq('location_id', BANYAN_LOCATION_ID)
          .limit(1);
        if (tryLegacy.data && tryLegacy.data.length) {
          const s = tryLegacy.data[0];
          row = {
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

      if (row) {
        const s = row;
        const txt =
          `Sales for ${s.date}:\n` +
          `- Net Sales: $${Number(s.net_sales || 0).toFixed(2)}\n` +
          `- Bar Sales: $${Number(s.bar_sales || 0).toFixed(2)}\n` +
          (s.comps != null ? `- Comps: ${s.comps}\n` : '') +
          (s.voids != null ? `- Voids: ${s.voids}\n` : '') +
          (s.total_tips != null ? `- Total Tips: $${Number(s.total_tips || 0).toFixed(2)}\n` : '') +
          (s.deposit != null ? `- Deposit: $${Number(s.deposit || 0).toFixed(2)}\n` : '');

        return NextResponse.json({
          text: txt.trim(),
          role: 'assistant',
          name: 'Merv',
          content: txt.trim(),
          meta: { intent: 'sales', date: s.date },
        });
      }
      // If no row, fall through to model for a helpful response
    }

    /* ──────────────────────────────────────────────────────────────────────
       System prompt & OpenAI (for everything else)
    ─────────────────────────────────────────────────────────────────────── */

    const contactsPolicy = `
Contacts & Personal Info (policy)
- You may provide phone numbers or emails ONLY if they are present in ContactsContext (these are internal records).
- If ContactsContext is missing or empty, ask if they'd like to add the contact.
    `.trim();

    const vaultSummary = generateVaultSummary(vault);
    const systemPrompt = `
User Profile Summary:
${vaultSummary}

${basePersona}

${contactsPolicy}
${contactsContext}
${salesContext}
`.trim();

    const primer: { role: 'assistant'; content: string } = {
      role: 'assistant',
      content: 'Understood. Respond concisely with clear next steps when appropriate.',
    };

    const trimmed = history.slice(-10);

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

    return NextResponse.json({
      text: reply,
      role: 'assistant',
      name: 'Merv',
      content: reply,
    });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    const msg = `Error: ${err?.message || String(err)}`;
    return NextResponse.json(
      { text: msg, role: 'assistant', name: 'Merv', content: msg },
      { status: 500 }
    );
  }
}
