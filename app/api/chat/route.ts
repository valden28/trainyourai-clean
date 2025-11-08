// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs';
const DEBUG_LOG = true;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ────────────────────────── Helpers & Intent regex ────────────────────────── */

type ChatMsg = { role: 'user' | 'assistant' | 'system'; content: string };

function sanitizeHistory(input: any[]): ChatMsg[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => {
      const r = String(m.role || '').toLowerCase();
      const role: ChatMsg['role'] = r === 'assistant' ? 'assistant' : r === 'system' ? 'system' : 'user';
      return { role, content: m.content.trim() };
    })
    .slice(-10);
}

const CONTACT_INTENT  = /\b(phone|number|email|contact|employee|staff|manager|gm|general manager)\b/i;
const SALES_INTENT    = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;
const SEARCH_INTENT   = /\b(search|find|look\s*up|lookup|show|list)\b/i;
const INCOME_INTENT   = /\binvoice(s)?\b/i;
const PRICE_INTENT    = /\b(how\s*much|price|cost|how\s*much\s*is)\b/i;

const SOURCE_SYNONYMS: Record<string, string> = {
  // employees
  employee: 'employees', staff: 'employees', manager: 'employees', gm: 'employees',
  // items & pricing
  item: 'items', items: 'items', 'item book': 'items', sku: 'items', cbi: 'items',
  'item price': 'item_prices', 'contract': 'item_prices', 'contract price': 'item_prices',
  // invoices
  invoice: 'invoices', invoices: 'invoices',
  'invoice line': 'invoice_lines', 'invoice lines': 'invoice_lines', line: 'invoice_lines',
  // schedules
  schedule: 'schedules', schedules: 'schedules', shift: 'schedules',
  // sales
  sale: 'daily_sales', sales: 'daily_sales', 'daily sales': 'daily_sales',
  // inventory
  inventory: 'inventory_counts', 'inventory count': 'inventory_counts', 'inventory counts': 'inventory_counts',
};

function guessSourcesFromText(msg: string): string[] {
  const m = msg.toLowerCase();
  const picked = new Set<string>();
  for (const [phrase, src] of Object.entries(SOURCE_SYNONYMS)) {
    if (m.includes(phrase)) picked.add(src);
  }
  return [...picked];
}

function cleanQuery(msg: string): { query: string; sources: string[] } {
  const sources = guessSourcesFromText(msg);
  let q = ` ${msg.toLowerCase()} `;

  // strip command words / preps / filler
  q = q.replace(/\b(search|find|look\s*up|lookup|show|list)\b/g, ' ');
  q = q.replace(/\b(in|from|for|within|on|of|about|with|by|at|to)\b/g, ' ');
  q = q.replace(/\b(everything|all|entire|database|records?)\b/g, ' ');
  q = q.replace(/\b(can|could|would|please|show|give|have|need|do|you|me|the|a|an)\b/g, ' ');

  // remove source phrases from the query
  for (const phrase of Object.keys(SOURCE_SYNONYMS)) {
    const rx = new RegExp(`\\b${phrase.replace(/\s+/g, '\\s+')}\\b`, 'g');
    q = q.replace(rx, ' ');
  }

  q = q.replace(/\s+/g, ' ').trim();
  return { query: q, sources };
}

function extractName(s: string): string | null {
  if (!s) return null;
  const mFor = s.match(/\bfor\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
  if (mFor?.[1]) return mFor[1].trim();
  const all = s.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g) || [];
  const blacklist = new Set(['i','phone','number','email','sales','manager','chef','merv','luna','team','employees']);
  const candidates = [...new Set(all)]
    .map((t) => t.trim())
    .filter((t) => !blacklist.has(t.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  return candidates[0] || null;
}

function parseDateSmart(s: string): string | null {
  const iso = s.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];
  const us = s.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (us) {
    const mm = +us[1], dd = +us[2];
    let yy = us[3] ? +us[3] : new Date().getFullYear();
    if (yy < 100) yy += 2000;
    const dt = new Date(yy, mm - 1, dd);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }
  return null;
}

// Use the corrected “double-d” location id you validated earlier.
const BANYAN_LOCATION_ID = '2da9f238-3449-41db-b69d-bdbd357d6496';

/* ────────────────────────── Main Route ────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    // Tolerant auth
    let user_uid: string | null = null;
    try {
      const session = await getSession(req, NextResponse.next());
      user_uid = session?.user?.sub ?? null;
    } catch {
      user_uid = null;
    }

    // Parse body → normalized history
    const raw = await req.text();
    let parsed: any = {};
    try { parsed = raw ? JSON.parse(raw) : {}; } catch {}
    let history = sanitizeHistory(Array.isArray(parsed?.messages) ? parsed.messages : []);
    if (!history.length && typeof parsed?.message === 'string' && parsed.message.trim()) {
      history = [{ role: 'user', content: parsed.message.trim() }];
    }
    if (!history.length) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 });
    }

    const lastUserMsg = history[history.length - 1]?.content ?? '';
    if (DEBUG_LOG) console.log('[MERV DEBUG] lastUserMsg:', lastUserMsg);

    // Tenant (optional)
    let tenant_id: string | null = null;
    if (user_uid) {
      try {
        const { data: vault, error: vErr } = await (supabase
          .from('vaults_test')
          .select('*')
          .eq('user_uid', user_uid)
          .maybeSingle());
        if (!vErr && vault) {
          // @ts-ignore
          tenant_id = (vault?.tenant_id as string) ?? null;
        }
      } catch { /* ignore */ }
    }

    /* ───────── EMPLOYEES: phone/email ───────── */
    if (CONTACT_INTENT.test(lastUserMsg)) {
      const nameGuess = extractName(lastUserMsg);
      const cleaned = (nameGuess || lastUserMsg)
        .replace(/(phone|number|email|contact|employee|manager|staff|gm|general manager)\b/gi, '')
        .replace(/[^\w' ]+/g, ' ')
        .trim();

      const tokens = cleaned.split(' ').filter((t) => t.length > 1).slice(0, 3);
      if (DEBUG_LOG) console.log('[MERV DEBUG][employees] query tokens:', tokens);

      const ors: string[] = [];
      if (cleaned) ors.push(`email.ilike.%${cleaned}%`);
      for (const t of tokens) {
        ors.push(`first_name.ilike.%${t}%`, `last_name.ilike.%${t}%`, `email.ilike.%${t}%`);
      }

      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, phone')
        .or(ors.join(','))
        .limit(5);

      if (empErr) {
        const errTxt = `Employee lookup error: ${empErr.message}`;
        return NextResponse.json({ text: errTxt, role: 'assistant', name: 'Merv', content: errTxt });
      }

      if (employees && employees.length > 0) {
        const e: any = employees[0];
        const full = [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown';
        const txt =
          `${full}\n` +
          (e.email ? `• Email: ${e.email}\n` : '') +
          (e.phone ? `• Phone: ${e.phone}\n` : '');
        return NextResponse.json({ text: txt.trim(), role: 'assistant', name: 'Merv', content: txt.trim() });
      }

      return NextResponse.json({
        text: `I couldn’t find ${cleaned || 'that person'} in employees.`,
        role: 'assistant',
        name: 'Merv',
        content: `I couldn’t find ${cleaned || 'that person'} in employees.`,
      });
    }

    /* ───────── SALES: robust by date ───────── */
    if (SALES_INTENT.test(lastUserMsg)) {
      const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0, 10);
      if (DEBUG_LOG) console.log('[MERV DEBUG][sales] date:', d);

      type SalesRow = {
        date?: string;
        work_date?: string;
        net_sales?: number | null;
        bar_sales?: number | null;
        total_tips?: number | null;
        comps?: number | null;
        voids?: number | null;
        deposit?: number | string | null;
      };

      async function firstHit(...queries: Array<() => Promise<any>>): Promise<SalesRow | null> {
        for (const q of queries) {
          try {
            const { data } = await q();
            if (data && data.length) return data[0] as SalesRow;
          } catch { /* continue */ }
        }
        return null;
      }

      const row = await firstHit(
        () => supabase.from('daily_sales').select('date, net_sales, bar_sales, total_tips, comps, voids, deposit').eq('date', d).eq('location_id', BANYAN_LOCATION_ID).limit(1),
        () => supabase.from('daily_sales').select('date, net_sales, bar_sales, total_tips, comps, voids, deposit').eq('date', d).limit(1),
        () => supabase.from('sales_daily').select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit').eq('work_date', d).eq('location_id', BANYAN_LOCATION_ID).limit(1),
        () => supabase.from('sales_daily').select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit').eq('work_date', d).limit(1),
        () => supabase.from('sales_daily').select('date, net_sales, bar_sales, total_tips, comps, voids, deposit').eq('date', d).eq('location_id', BANYAN_LOCATION_ID).limit(1),
        () => supabase.from('sales_daily').select('date, net_sales, bar_sales, total_tips, comps, voids, deposit').eq('date', d).limit(1),
      );

      if (!row) {
        return NextResponse.json({
          text: `No sales found for ${d}${BANYAN_LOCATION_ID ? ' (Banyan House)' : ''}.`,
          role: 'assistant', name: 'Merv', content: `No sales found for ${d}${BANYAN_LOCATION_ID ? ' (BANYAN House)' : ''}.`
        });
      }

      const day = row.date || row.work_date || d;
      const txt =
        `Sales for ${day}\n` +
        `• Net Sales: $${Number(row.net_sales ?? 0).toFixed(2)}\n` +
        `• Bar Sales: $${Number(row.bar_sales ?? 0).toFixed(2)}\n` +
        (row.total_tips != null ? `• Total Tips: $${Number(row.total_tips).f
toFixed(2)}\n` : '') +
        (row.comps != null ? `• Comps: ${row.comps}\n` : '') +
        (row.voids != null ? `• Voids: ${row.voids}\n` : '') +
        (row.deposit != null ? `• Deposit: ${row.deposit}\n` : '');
      return NextResponse.json({ text: txt.trim(), role: 'assistant', name: 'Merv', content: txt.trim() });
    }

    /* ───────── INVOICE fallback (natural-language) ───────── */
    if (INCOME_INTENT.test(lastUserMsg)) {
      const { query } = cleanQuery(lastUserMsg);
      const src = ['invoices', 'invoice_lines'];
      if (DEBUG_LOG) console.log('[MERV DEBUG][invoice]', { query, src });

      const { data, error } = await supabase.rpc('rpc_search_all', {
        p_timeline: null, // ignored by function; keep signature stable if variant installed
        p_tenant:   tenant_id ?? null,
        p_query:    query || 'invoice',
        p_sources:  src,
        p_limit:    12,
      });

      if (error) {
        const errTxt = `Search error: ${error.message}`;
        return NextResponse.json({ text: errTxt, role: 'assistant', name: 'Merv', content: errTxt });
      }
      if (!data?.length) {
        const miss = `No invoices found for “${query || '(blank)'}”.`;
        return NextResponse.json({ text: miss, role: 'assistant', name: 'Merv', content: miss });
      }

      const lines = (data || []).map((r: any) => `• [${r.source_table}] ${r.title} — ${r.snippet}`).join('\n');
      const txt = `Invoice results for “${query}”:\n${lines}`;
      return NextResponse.json({ text: txt, role: 'assistant', name: 'Merv', content: txt });
    }

    /* ───────── PRICE lookup (from search_index) ───────── */
    if (PRICE_INTENT.test(lastUserMsg)) {
      const { query } = cleanQuery(lastUserMsg);
      const q = (query || lastUserMsg).trim();
      if (DEBUG_LOG) console.log('[MERV DEBUG][price] q:', q);

      // 1) direct index hit
      const { data: idx, error: idxErr } = await supabase
        .from('search_index')
        .select('title, meta')
        .eq('source_table', 'items')
        .or(`title.ilike.%${q}%,snippet.ilike.%${q}%`)
        .limit(5);

      if (idxErr) {
        const errTxt = 'Price lookup error: ' + idxErr.message;
        return NextResponse.json({ text: errTxt, role: 'assistant', name: 'Merv', content: errTxt });
      }

      const indexHit = (idx || []).find((r: any) => r?.meta && (r as any).meta?.price != null);
      if (indexHit) {
        const m: any = indexHit.meta || {};
        const price = Number(m.price);
        const ts    = m.price_timestamp || null;
        const vendor= m.price_vendor || null;
        const title = indexHit.title || 'item';

        const txt =
          `${title}\n` +
          `• Price: ${Number.isFinite(price) ? `$${price.toFixed(2)}` : String(m.price)}\n` +
          (vendor ? `• Vendor: ${vendor}\n` : '') +
          (ts ? `• As of: ${ts}\n` : '');
        if (DEBUG_LOG) console.log('[MERV DEBUG][price] index hit');
        return NextResponse.json({ text: txt.trim(), role: 'assistant', name: 'Merv', content: txt.trim() });
      }

      // 2) fallback: rpc_search_all on items
      const { data: hits, error: rpcErr } = await supabase.rpc('rpc_search_all', {
        p_tenant: tenant_id ?? null,
        p_query: q,
        p_sources: ['items'],
        p_limit: 5,
      });
      if (rpcErr) {
        const errTxt = `Price search error: ${rpcErr.message}`;
        return NextResponse.json({ text: errTxt, role: 'assistant', name: 'Merv', content: errTxt });
      }

      const rpcHit = (hits || []).find((h: any) => h?.meta && h.meta?.price != null);
      if (rpcHit) {
        const m: any = rpcHit.meta || {};
        const price = Number(m.price);
        const ts    = m.price_timestamp || null;
        const vendor= m.price_vendor || null;
        const title = rpcHit.title || 'item';

        const txt =
          `${title}\n` +
          `• Price: ${Number.isFinite(price) ? `$${price.toFixed(2)}` : String(m.price)}\n` +
          (vendor ? `• Vendor: ${vendor}\n` : '') +
          (ts ? `• As of: ${ts}\n` : '');
        if (DEBUG_LOG) console.log('[MERV DEBUG][price] rpc hit');
        return NextResponse.json({ text: txt.trim(), role: 'assistant', name: 'Merv', content: txt.trim() });
      }

      return NextResponse.json({
        text: `I couldn’t find a priced item that matches “${q}”. Try “search items for ${q}” to confirm the exact item text.`,
        role: 'assistant', name: 'Merv', content: `I couldn’t find a priced item that matches “${q}”.`
      });
    }

    /* ───────── GLOBAL SEARCH (explicit) ───────── */
    if (SEARCH_INTENT.test(lastUserMsg)) {
      const { query, sources } = cleanQuery(lastUserMsg);
      const src = sources.length ? sources : null;
      if (DEBUG_LOG) console.log('[MERV DEBUG][search]', { query, src });

      const { data, error } = await supabase.rpc('rpc_search_all', {
        p_tenant: tenant_id ?? null,
        p_query: query || '(blank)',
        p_sources: src,
        p_limit: 12,
      });

      if (error) {
        const errTxt = `Search error: ${error.message}`;
        return NextResponse.json({ text: erratiu(err?.message || 'Search error'), role: 'assistant', name: 'Merv', content: errTxt });
      }
      if (!data?.length) {
        const hint = src ? ` in ${src.join(', ')}` : '';
        const miss = `No results for “${query || '(blank)'}”${hint}.`;
        return NextResponse.json({ text: miss, role: 'assistant', name: 'Merv', content: miss });
      }

      const lines = (data || []).map((r: any) => `• [${r.source_table}] ${r.title} — ${r.snippet}`).join('\n');
      const txt = `Search results for “${query}”${src ? ` in ${src.join(', ')}` : ''}:\n${lines}`;
      return NextResponse.json({ text: txt, role: 'assistant', name: 'Merv', content: txt });
    }

    /* ───────── Default to model (concise) ───────── */
    const systemPrompt = `
${tenant_id ? generateVaultSummary?.({ user_uid: user_uid, tenant_id }) ?? '' : ''}
You are Merv. Be concise, factual, and owner-friendly. If a direct data answer was not found above, answer briefly without inventing numbers.
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
      ],
    });

    const fallback = completion.choices?.[0]?.message?.content ?? 'Okay.';
    return NextResponse.json({ text: String(fallback), role: 'assistant', name: 'Merv', content: String(fallback) });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    const msg = `Error: ${err?.message || String(err)}`;
    return NextResponse.json({ text: msg, role: 'assistant', name: 'Merv', content: msg }, { status: 500 });
  }
}

/* Healthcheck */
export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/chat' });
}
