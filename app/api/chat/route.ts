// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs';

// Toggle to see server logs (Vercel → Functions → Logs)
const DEBUG_LOG = true;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ──────────────────────────────────────────────────────────────────────────────
   Helpers
────────────────────────────────────────────────────────────────────────────── */
function sanitizeHistory(input: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => {
      const r = String(m.role || '').toLowerCase();
      const role: 'user' | 'assistant' = r === 'assistant' ? 'assistant' : 'user';
      return { role, content: m.content.trim() };
    });
}

// Broad people/contacts trigger
const CONTACT_INTENT =
  /\b(phone|number|email|contact|reach|call|text|employee|staff|worker|team|manager|gm|general manager)\b/i;
const SALES_INTENT = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;

function extractName(s: string): string | null {
  if (!s) return null;
  const mFor = s.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (mFor?.[1]) return mFor[1].trim();
  const all = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g) || [];
  const blacklist = new Set(
    ['I','Phone','Number','Email','Sales','Report','Manager','Chef','Merv','Luna','Team','Employees'].map(t=>t.trim())
  );
  const candidates = Array.from(new Set(all))
    .map(t => t.trim())
    .filter(t => !blacklist.has(t))
    .sort((a,b)=> b.split(' ').length - a.split(' ').length);
  return candidates[0] || null;
}

function parseDateSmart(s: string): string | null {
  const iso = s.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];

  const us = s.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (us) {
    const mm = Number(us[1]); const dd = Number(us[2]);
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

// Banyan House location UUID
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
    let vault: any = null;
    try {
      const vr = await supabase
        .from('vaults_test')
        .select('*')
        .eq('user_uid', user_uid)
        .single();
      vault = vr.data ?? null;
    } catch {
      vault = null;
    }
    const tenant_id: string | null = vault?.tenant_id || null;
    if (DEBUG_LOG) console.log('[MERV DEBUG] tenant_id:', tenant_id ?? '(null)');

    // Persona
    let brain: any = null;
    try {
      const br = await supabase
        .from('merv_brain')
        .select('prompt')
        .eq('user_uid', user_uid)
        .maybeSingle();
      brain = br.data ?? null;
    } catch {
      brain = null;
    }
    const basePersona = brain?.prompt || 'You are Merv — grounded, sharp, calibrated.';

    /* ──────────────────────────────────────────────────────────────────────
       EMPLOYEES lookup (robust, early return, NO OpenAI)
    ─────────────────────────────────────────────────────────────────────── */
    if (CONTACT_INTENT.test(lastUserMsg)) {
      const rawName = extractName(lastUserMsg) || '';
      const cleanedBase = rawName && rawName.length >= 3 ? rawName : lastUserMsg;

      const norm = cleanedBase
        .replace(/(phone|number|email|contact|reach|call|text|employee|staff|worker|team|manager|gm|general manager)\b/gi, '')
        .replace(/[’']/g, "'")
        .replace(/[^\w' ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const tokens = norm.split(' ').filter(t => t.length >= 2).slice(0, 3); // up to 3 words
      if (DEBUG_LOG) console.log('[MERV DEBUG] employee intent', { norm, tokens });

      // Build OR list to search many likely columns
      const ors: string[] = [];
      if (norm) {
        ors.push(`full_name.ilike.%${norm}%`);
        ors.push(`name.ilike.%${norm}%`);
        ors.push(`email.ilike.%${norm}%`);
        ors.push(`phone.ilike.%${norm}%`);
        ors.push(`phone_number.ilike.%${norm}%`);
      }
      tokens.forEach(t => {
        ors.push(`full_name.ilike.%${t}%`);
        ors.push(`name.ilike.%${t}%`);
        ors.push(`first_name.ilike.%${t}%`);
        ors.push(`last_name.ilike.%${t}%`);
        ors.push(`email.ilike.%${t}%`);
        ors.push(`phone.ilike.%${t}%`);
        ors.push(`phone_number.ilike.%${t}%`);
      });

      const baseSelect =
        'id, full_name, name, first_name, last_name, email, phone, phone_number';

      // First pass: with tenant filter if present
      let resp: any;
      if (tenant_id) {
        resp = await supabase
          .from('employees')
          .select(baseSelect)
          .eq('tenant_id', tenant_id)
          .or(ors.join(','))
          .limit(10);
      } else {
        resp = await supabase
          .from('employees')
          .select(baseSelect)
          .or(ors.join(','))
          .limit(10);
      }

      // Second pass: extra-loose on full norm, no tenant filter
      if ((!resp?.data || !resp.data.length) && norm) {
        resp = await supabase
          .from('employees')
          .select(baseSelect)
          .or(`full_name.ilike.%${norm}%,name.ilike.%${norm}%,email.ilike.%${norm}%,phone.ilike.%${norm}%,phone_number.ilike.%${norm}%`)
          .limit(10);
      }

      const hits: any[] = resp?.data ?? [];
      if (DEBUG_LOG) console.log('[MERV DEBUG] employee hits count:', hits.length);

      if (hits.length) {
        const pick = (() => {
          const lower = norm.toLowerCase();
          const exact = hits.find(h =>
            (h.full_name && h.full_name.toLowerCase() === lower) ||
            (h.name && h.name.toLowerCase() === lower) ||
            ((h.first_name || h.last_name) &&
              `${(h.first_name||'').toLowerCase()} ${(h.last_name||'').toLowerCase()}`.trim() === lower)
          );
          return exact || hits[0];
        })();

        const displayName =
          pick.full_name ||
          pick.name ||
          [pick.first_name, pick.last_name].filter(Boolean).join(' ') ||
          'Unknown';

        const phoneOut = pick.phone_number || pick.phone || null;
        const emailOut = pick.email || null;

        const lines = [
          displayName,
          emailOut ? `Email: ${emailOut}` : null,
          phoneOut ? `Phone: ${phoneOut}` : null,
        ].filter(Boolean);

        const directAnswer = lines.join('\n');

        return NextResponse.json({
          text: directAnswer,
          role: 'assistant',
          name: 'Merv',
          content: directAnswer,
          meta: { intent: 'employees', searched: norm, hitsCount: hits.length },
        });
      }

      const miss = extractName(lastUserMsg) || tokens.join(' ') || 'that person';
      const notFound =
        `I couldn’t find ${miss} in employees. If you give me a phone or email, I can save it for next time.`;

      return NextResponse.json({
        text: notFound,
        role: 'assistant',
        name: 'Merv',
        content: notFound,
        meta: { intent: 'employees', searched: norm, hitsCount: 0 },
      });
    }

    /* ──────────────────────────────────────────────────────────────────────
       SALES (early return)
    ─────────────────────────────────────────────────────────────────────── */
    if (SALES_INTENT.test(lastUserMsg)) {
      const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0, 10);

      let row: any = null;
      const tryDaily: any = await supabase
        .from('daily_sales')
        .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
        .eq('date', d)
        .eq('location_id', BANYAN_LOCATION_ID)
        .limit(1);
      if (tryDaily.data && tryDaily.data.length) row = tryDaily.data[0];

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
          (s.deposit != null ? `- Deposit: ${Number(s.deposit || 0).toFixed(2)}\n` : '');

        return NextResponse.json({
          text: txt.trim(),
          role: 'assistant',
          name: 'Merv',
          content: txt.trim(),
          meta: { intent: 'sales', date: s.date },
        });
      }
    }

    /* ──────────────────────────────────────────────────────────────────────
       System prompt & OpenAI (everything else)
    ─────────────────────────────────────────────────────────────────────── */
    const contactsPolicy = `
Contacts & Personal Info
- Provide phone numbers/emails only when returned by the server (employees lookup). Do not invent or refuse when the server provided it.
    `.trim();

    const systemPrompt = `
User Profile Summary:
${vault ? generateVaultSummary(vault) : ''}

${basePersona}

${contactsPolicy}
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
    return NextResponse.json({ text: reply, role: 'assistant', name: 'Merv', content: reply });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    const msg = `Error: ${err?.message || String(err)}`;
    return NextResponse.json(
      { text: msg, role: 'assistant', name: 'Merv', content: msg },
      { status: 500 }
    );
  }
}
