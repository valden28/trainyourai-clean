// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs';
const DEBUG_LOG = false;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ───────────── Helpers ───────────── */
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

const CONTACT_INTENT =
  /\b(phone|number|email|contact|employee|staff|manager|gm|general manager)\b/i;
const SALES_INTENT = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;

/** natural language → “search” intent */
const SEARCH_INTENT =
  /\b(search|find|look\s*up|lookup|show|list)\b/i;

/** optional: vault read/write (already added earlier, keep if you use it) */
// const VAULT_GET_INTENT    = /\b(what('?s|\s+is)\s+(my|the)\s+([a-z0-9_]{3,}))\b/i;
// const VAULT_SEARCH_INTENT = /\b(search|lookup)\s+(vault|profile|settings)\b/i;
// const VAULT_SAVE_INTENT   = /\b(save|set|remember)\s+([a-z0-9_]{3,})\s+as\s+(.+)/i;

function extractName(s: string): string | null {
  if (!s) return null;
  const mFor = s.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (mFor?.[1]) return mFor[1].trim();
  const all = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g) || [];
  const blacklist = new Set(['I','Phone','Number','Email','Sales','Manager','Chef','Merv','Luna','Team','Employees']);
  const candidates = Array.from(new Set(all)).map(t=>t.trim()).filter(t=>!blacklist.has(t)).sort((a,b)=>b.length-a.length);
  return candidates[0] || null;
}

function parseDateSmart(s: string): string | null {
  const iso = s.match(/\b(20\d{2}-\d{2}-\d{2})\b/); if (iso?.[1]) return iso[1];
  const us = s.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (us) { const mm=+us[1], dd=+us[2]; let yy=us[3]?+us[3]:new Date().getFullYear(); if(yy<100) yy+=2000; const dt=new Date(yy,mm-1,dd); if(!isNaN(dt.getTime())) return dt.toISOString().slice(0,10); }
  return null;
}

/** map everyday words → search sources (table names in search_index) */
const SOURCE_SYNONYMS: Record<string, string> = {
  employee: 'employees', staff: 'employees', manager: 'employees', gm: 'employees',
  item: 'items', items: 'items', 'item book': 'items', cbi: 'items', sku: 'items',
  'item price': 'item_prices', 'contract': 'item_prices', 'contract price': 'item_prices',
  invoice: 'invoices', invoices: 'invoices',
  'invoice line': 'invoice_lines', 'invoice lines': 'invoice_lines', line: 'invoice_lines',
  schedule: 'schedules', schedules: 'schedules', shift: 'schedules',
  sale: 'daily_sales', sales: 'daily_sales', 'daily sales': 'daily_sales',
  // add more mappings anytime (recipes, pmix, labor_timesheets, etc.)
};

function guessSourcesFromText(msg: string): string[] {
  const m = msg.toLowerCase();
  const chosen = new Set<string>();
  for (const [word, src] of Object.entries(SOURCE_SYNONYMS)) {
    if (m.includes(word)) chosen.add(src);
  }
  return Array.from(chosen);
}

function stripLeadingSearchWords(msg: string) {
  return msg.replace(/\b(search|find|look\s*up|lookup|show|list)\b/i,'')
            .replace(/\b(in|from|for|within|on)\b/i,'')
            .trim();
}

const BANYAN_LOCATION_ID = '2da9f238-3449-41db-b69d-bdbd357d6496';

/* ───────────── Main Route ───────────── */
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
    if (!history.length && typeof parsed?.message === 'string' && parsed.message.trim()) {
      history = [{ role: 'user', content: parsed.message.trim() }];
    }
    if (!history.length) return NextResponse.json({ error: 'Missing messages' }, { status: 400 });

    const lastUserMsg = history.slice().reverse().find(m=>m.role==='user')?.content || '';
    if (DEBUG_LOG) console.log('[MERV DEBUG] lastUserMsg:', lastUserMsg);

    // Vault / persona (tenant when available)
    let tenant_id: string | null = null;
    try {
      const { data: vault } = await supabase.from('vaults_test').select('*').eq('user_uid', user_uid).single();
      tenant_id = vault?.tenant_id || null;
    } catch {}
    const { data: brain } = await supabase.from('merv_brain').select('prompt').eq('user_uid', user_uid).maybeSingle();
    const basePersona = brain?.prompt || 'You are Merv — grounded, sharp, calibrated.';

    /* ───────── SEARCH (plain language → rpc_search_all) ───────── */
    if (SEARCH_INTENT.test(lastUserMsg)) {
      const sources = guessSourcesFromText(lastUserMsg);
      const stripped = stripLeadingSearchWords(lastUserMsg);
      const query = stripped || lastUserMsg;

      if (DEBUG_LOG) console.log('[MERV DEBUG] search', { query, sources });

      const { data, error } = await supabase.rpc('rpc_search_all', {
        p_tenant: tenant_id ?? null,
        p_query: query,
        p_sources: sources.length ? sources : null,
        p_limit: 12,
      });

      if (error) {
        if (DEBUG_LOG) console.error('[MERV DEBUG] search error:', error.message);
        return NextResponse.json({ text: `Search error: ${error.message}` });
      }

      if (!data?.length) {
        const hint = sources.length
          ? ` in ${sources.join(', ')}`
          : '';
        return NextResponse.json({ text: `No results for “${query}”${hint}. Try another term or specify a source like employees, items, invoices, invoice_lines, schedules, or daily_sales.` });
      }

      const lines = data.map((r: any) => `• [${r.source_table}] ${r.title} — ${r.snippet}`).join('\n');
      const txt = `Search results for “${query}”${sources.length ? ` in ${sources.join(', ')}` : ''}:\n${lines}`;
      return NextResponse.json({ text: txt, meta: { count: data.length } });
    }

    /* ───────── EMPLOYEES: direct phone/email (no AI) ───────── */
    if (CONTACT_INTENT.test(lastUserMsg)) {
      const nameGuess = extractName(lastUserMsg);
      const cleaned = (nameGuess || lastUserMsg)
        .replace(/(phone|number|email|contact|employee|manager|staff|gm)\b/gi,'')
        .replace(/[^\w' ]+/g,' ')
        .trim();

      const tokens = cleaned.split(' ').filter(t=>t.length>1).slice(0,3);
      const ors: string[] = [];
      if (cleaned) { ors.push(`email.ilike.%${cleaned}%`); }
      tokens.forEach(t => {
        ors.push(`first_name.ilike.%${t}%`);
        ors.push(`last_name.ilike.%${t}%`);
        ors.push(`email.ilike.%${t}%`);
      });

      const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone')
        .or(ors.join(','))
        .limit(5);

      if (employees?.length) {
        const e = employees[0];
        const full = [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown';
        const txt = [full, e.email ? `Email: ${e.email}` : null, e.phone ? `Phone: ${e.phone}` : null].filter(Boolean).join('\n');
        return NextResponse.json({ text: txt, meta: { intent: 'employees', hits: employees.length } });
      }

      const notFound = `I couldn’t find ${cleaned || 'that person'} in employees. If you give me a phone or email, I can save it for next time.`;
      return NextResponse.json({ text: notFound, meta: { intent: 'employees', hits: 0 } });
    }

    /* ───────── SALES: date summary (no AI) ───────── */
    if (SALES_INTENT.test(lastUserMsg)) {
      const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0, 10);

      let row: any = null;
      const { data: daily } = await supabase
        .from('daily_sales')
        .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
        .eq('date', d).eq('location_id', BANYAN_LOCATION_ID).limit(1);
      if (daily?.[0]) row = daily[0];

      if (!row) {
        const { data: legacy } = await supabase
          .from('sales_daily')
          .select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit')
          .eq('work_date', d).eq('location_id', BANYAN_LOCATION_ID).limit(1);
        if (legacy?.[0]) {
          const s = legacy[0];
          row = { date: s.work_date, net_sales: s.net_sales, bar_sales: s.bar_sales, total_tips: s.total_tips, comps: s.comps, voids: s.voids, deposit: s.deposit };
        }
      }

      if (row) {
        const s = row;
        const txt =
          `Sales for ${s.date}:\n` +
          `- Net Sales: $${Number(s.net_sales || 0).toFixed(2)}\n` +
          `- Bar Sales: $${Number(s.bar_sales || 0).toFixed(2)}\n` +
          (s.total_tips ? `- Total Tips: $${Number(s.total_tips).toFixed(2)}\n` : '') +
          (s.comps ? `- Comps: ${s.comps}\n` : '') +
          (s.voids ? `- Voids: ${s.voids}\n` : '') +
          (s.deposit ? `- Deposit: ${s.deposit}\n` : '');
        return NextResponse.json({ text: txt.trim(), meta: { intent: 'sales', date: s.date } });
      }
    }

    /* ───────── Everything else → concise AI reply ───────── */
    const systemPrompt = `
User Profile Summary:
${generateVaultSummary ? (await (async()=>{ try{ const {data:vault}=await supabase.from('vaults_test').select('*').eq('user_uid', (session?.user?.sub||'')).single(); return generateVaultSummary(vault||{});}catch{return ''}})()) : ''}

${basePersona}

Notes:
- Prefer direct, factual answers. Be concise.
- If user asks to "search", call the server search (handled above). Do not invent results.
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.slice(-10),
      ],
    });

    const reply = completion.choices?.[0]?.message?.content || '[No reply]';
    return NextResponse.json({ text: reply });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    const msg = `Error: ${err?.message || String(err)}`;
    return NextResponse.json({ text: msg }, { status: 500 });
  }
}
