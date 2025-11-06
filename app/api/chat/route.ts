// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs';
const DEBUG_LOG = true;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ────────────────────────── Helpers ────────────────────────── */
function sanitizeHistory(input: any[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => {
      const r = String(m.role || '').toLowerCase();
      const role: 'user' | 'assistant' = r === 'assistant' ? 'assistant' : 'user';
      return { role, content: m.content.trim() };
    })
    .slice(-10);
}

const CONTACT_INTENT = /\b(phone|number|email|contact|employee|staff|manager|gm)\b/i;
const SALES_INTENT   = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;
const SEARCH_INTENT  = /\b(search|find|look\s*up|lookup|show|list)\b/i;

// everyday words → your search sources (tables in search_index)
const SOURCE_SYNONYMS: Record<string, string> = {
  employee: 'employees', staff: 'employees', manager: 'employees', gm: 'employees',
  item: 'items', items: 'items', 'item book': 'items', sku: 'items', cbi: 'items',
  'item price': 'item_prices', 'contract': 'item_prices', 'contract price': 'item_prices',
  invoice: 'invoices', invoices: 'invoices',
  'invoice line': 'invoice_lines', 'invoice lines': 'invoice_lines', line: 'invoice_lines',
  schedule: 'schedules', schedules: 'schedules', shift: 'schedules',
  sale: 'daily_sales', sales: 'daily_sales', 'daily sales': 'daily_sales',
  // add more later (recipes, pmix, labor_timesheets, etc.)
};

function guessSourcesFromText(msg: string): string[] {
  const m = msg.toLowerCase();
  const chosen = new Set<string>();
  for (const [word, src] of Object.entries(SOURCE_SYNONYMS)) {
    if (m.includes(word)) chosen.add(src);
  }
  return Array.from(chosen);
}

function stripSearchLead(msg: string) {
  return msg
    .replace(/\b(search|find|look\s*up|lookup|show|list)\b/i, '')
    .replace(/\b(in|from|for|within|on)\b/i, '')
    .trim();
}

function extractName(s: string): string | null {
  if (!s) return null;
  const mFor = s.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (mFor?.[1]) return mFor[1].trim();
  const all = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g) || [];
  const blacklist = new Set(['I','Phone','Number','Email','Sales','Manager','Chef','Merv','Luna','Team','Employees']);
  const names = all.filter(w => !blacklist.has(w)).sort((a,b)=>b.length-a.length);
  return names[0] || null;
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
  return null;
}

// ✅ Correct Banyan House UUID (note the double “d”)
const BANYAN_LOCATION_ID = '2da9f238-3449-41db-b69d-bdbd357dd496';

/* ────────────────────────── Main Route ────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await getSession(req, NextResponse.next());
    const user_uid = session?.user?.sub;
    if (!user_uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Body
    const raw = await req.text();
    let parsed: any = {};
    try { parsed = raw ? JSON.parse(raw) : {}; } catch {}
    let history = sanitizeHistory(Array.isArray(parsed?.messages) ? parsed.messages : []);
    if (!history.length && typeof parsed?.message === 'string' && parsed.message.trim())
      history = [{ role: 'user', content: parsed.message.trim() }];
    if (!history.length) return NextResponse.json({ error: 'Missing messages' }, { status: 400 });

    const lastUserMsg = history.slice().reverse().find(m=>m.role==='user')?.content || '';
    if (DEBUG_LOG) console.log('[MERV DEBUG] lastUserMsg:', lastUserMsg);

    // Vault / persona (tenant is optional but useful for search filtering)
    let tenant_id: string | null = null;
    try {
      const { data: vault } = await supabase.from('vaults_test').select('*').eq('user_uid', user_uid).single();
      tenant_id = vault?.tenant_id || null;
    } catch {}
    const { data: brain } = await supabase.from('merv_brain').select('prompt').eq('user_uid', user_uid).maybeSingle();
    const basePersona = brain?.prompt || 'You are Merv — grounded, sharp, calibrated.';

    /* ───────────────────── EMPLOYEE LOOKUP ───────────────────── */
    if (CONTACT_INTENT.test(lastUserMsg)) {
      const nameGuess = extractName(lastUserMsg);
      const cleaned = (nameGuess || lastUserMsg)
        .replace(/(phone|number|email|contact|employee|manager|staff|gm)\b/gi, '')
        .replace(/[^\w' ]+/g, ' ')
        .trim();

      const tokens = cleaned.split(' ').filter(t => t.length > 1);
      if (DEBUG_LOG) console.log('[MERV DEBUG] employee search', { cleaned, tokens });

      const ors: string[] = [];
      tokens.forEach(t => {
        ors.push(`first_name.ilike.%${t}%`);
        ors.push(`last_name.ilike.%${t}%`);
        ors.push(`email.ilike.%${t}%`);
      });

      if (cleaned) {
        ors.push(`email.ilike.%${cleaned}%`);
        const first = cleaned.split(' ')[0];
        if (first) ors.push(`first_name.ilike.%${first}%`);
      }

      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone')
        .or(ors.join(','))
        .limit(5);

      if (error) console.error('[MERV DEBUG] supabase error', error);
      if (DEBUG_LOG) console.log('[MERV DEBUG] employee hits', employees?.length || 0);

      if (employees && employees.length) {
        const e = employees[0];
        const fullName = [e.first_name, e.last_name].filter(Boolean).join(' ');
        const lines = [
          fullName,
          e.email ? `Email: ${e.email}` : null,
          e.phone ? `Phone: ${e.phone}` : null,
        ].filter(Boolean);
        const reply = lines.join('\n');

        return NextResponse.json({
          text: reply,
          role: 'assistant',
          name: 'Merv',
          content: reply,
          meta: { intent: 'employees', hits: employees.length },
        });
      }

      const notFound = `I couldn’t find ${cleaned || 'that person'} in employees.`;
      return NextResponse.json({
        text: notFound,
        role: 'assistant',
        name: 'Merv',
        content: notFound,
        meta: { intent: 'employees', hits: 0 },
      });
    }

    /* ───────────────────── SALES LOOKUP (robust) ───────────────────── */
    if (SALES_INTENT.test(lastUserMsg)) {
      const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0, 10);
      if (DEBUG_LOG) console.log('[MERV DEBUG][sales] date:', d);

      type Row = {
        date?: string;
        work_date?: string;
        net_sales?: number | null;
        bar_sales?: number | null;
        total_tips?: number | null;
        comps?: number | null;
        voids?: number | null;
        deposit?: number | string | null;
      } | null;

      async function qDailyByDate(withLoc: boolean): Promise<Row> {
        let q = supabase.from('daily_sales')
          .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
          .eq('date', d)
          .limit(1);
        if (withLoc) q = q.eq('location_id', BANYAN_LOCATION_ID);
        const { data } = await q;
        return data?.[0] ?? null;
      }

      async function qLegacyByWorkDate(withLoc: boolean): Promise<Row> {
        let q = supabase.from('sales_daily')
          .select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit')
          .eq('work_date', d)
          .limit(1);
        if (withLoc) q = q.eq('location_id', BANYAN_LOCATION_ID);
        const { data } = await q;
        return data?.[0] ?? null;
      }

      async function qLegacyByDate(withLoc: boolean): Promise<Row> {
        let q = supabase.from('sales_daily')
          .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
          .eq('date', d)
          .limit(1);
        if (withLoc) q = q.eq('location_id', BANYAN_LOCATION_ID);
        const { data } = await q;
        return data?.[0] ?? null;
      }

      const tries: Array<() => Promise<Row>> = [
        // daily_sales (uses "date")
        () => qDailyByDate(true),
        () => qDailyByDate(false),
        // sales_daily (older dumps often use "work_date")
        () => qLegacyByWorkDate(true),
        () => qLegacyByWorkDate(false),
        // some sales_daily versions also have "date"
        () => qLegacyByDate(true),
        () => qLegacyByDate(false),
      ];

      let row: Row = null;
      for (const run of tries) {
        try { row = await run(); if (row) break; } catch {}
      }

      if (!row) {
        const miss = `No sales found for ${d}${BANYAN_LOCATION_ID ? ' (Banyan House)' : ''}.`;
        if (DEBUG_LOG) console.log('[MERV DEBUG][sales] not found');
        return NextResponse.json({ text: miss, role: 'assistant', name: 'Merv', content: miss });
      }

      const s = row as NonNullable<Row>;
      const day = s.date || s.work_date || d;
      const txt =
        `Sales for ${day}:\n` +
        `- Net Sales: $${Number(s.net_sales || 0).toFixed(2)}\n` +
        `- Bar Sales: $${Number(s.bar_sales || 0).toFixed(2)}\n` +
        (s.total_tips != null ? `- Total Tips: $${Number(s.total_tips || 0).toFixed(2)}\n` : '') +
        (s.comps != null ? `- Comps: ${s.comps}\n` : '') +
        (s.voids != null ? `- Voids: ${s.voids}\n` : '') +
        (s.deposit != null ? `- Deposit: ${s.deposit}\n` : '');
      return NextResponse.json({ text: txt.trim(), role: 'assistant', name: 'Merv', content: txt.trim() });
    }

    /* ───────────────────── GLOBAL SEARCH (direct to rpc_search_all) ───────────────────── */
    if (SEARCH_INTENT.test(lastUserMsg)) {
      const sources = guessSourcesFromText(lastUserMsg);         // [] → search everything
      const query = stripSearchLead(lastUserMsg) || lastUserMsg; // strip "search/find..." lead
      if (DEBUG_LOG) console.log('[MERV DEBUG][search]', { query, sources });

      try {
        const { data, error } = await supabase.rpc('rpc_search_all', {
          p_tenant: tenant_id ?? null,
          p_query: query.trim(),
          p_sources: sources.length ? sources : null,
          p_limit: 12,
        });

        if (error) {
          const errTxt = `Search error: ${error.message}`;
          return NextResponse.json({ text: errTxt, role: 'assistant', name: 'Merv', content: errTxt });
        }

        if (!data?.length) {
          const hint = sources.length ? ` in ${sources.join(', ')}` : '';
          const miss = `No results for “${query.trim()}”${hint}.`;
          return NextResponse.json({ text: miss, role: 'assistant', name: 'Merv', content: miss });
        }

        const lines = data.map((r: any) => `• [${r.source_table}] ${r.title} — ${r.snippet}`).join('\n');
        const txt = `Search results for “${query.trim()}”${sources.length ? ` in ${sources.join(', ')}` : ''}:\n${lines}`;
        return NextResponse.json({ text: txt, role: 'assistant', name: 'Merv', content: txt });
      } catch (e: any) {
        const errTxt = `Search error: ${e?.message || 'unknown'}`;
        return NextResponse.json({ text: errTxt, role: 'assistant', name: 'Merv', content: errTxt });
      }
    }

    /* ───────────────────── DEFAULT → OpenAI ───────────────────── */
    const systemPrompt = `
User Profile Summary:
${tenant_id ? generateVaultSummary?.({ user_uid: user_uid, tenant_id }) ?? '' : ''}

${basePersona}

Notes:
- Prefer direct, factual answers. Be concise.
- If user asks to "search", the server performs it (handled above). Do not invent results.
    `.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || '[No reply]';
    return NextResponse.json({ text: reply, role: 'assistant', name: 'Merv', content: reply });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    const msg = `Error: ${err?.message || String(err)}`;
    return NextResponse.json({ text: msg, role: 'assistant', name: 'Merv', content: msg }, { status: 500 });
  }
}
