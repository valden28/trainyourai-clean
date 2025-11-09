// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0/edge';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseServer';
import generateVaultSummary from '@/utils/vaultSummary';

export const runtime = 'nodejs';
const DEBUG_LOG = true;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/* ────────────────────────── Helpers & intents ────────────────────────── */

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

const CONTACT_INTENT = /\b(phone|number|email|contact|employee|staff|manager|gm|general manager)\b/i;
const SALES_INTENT   = /\b(sales?|revenue|net sales|bar sales|daily sales)\b/i;
const SEARCH_INTENT  = /\b(search|find|look\s*up|lookup|show|list)\b/i;
const INVOICE_INTENT = /\binvoice(s)?\b/i;
const PRICE_INTENT   = /\b(how\s*much|price|cost|how\s*much\s*is)\b/i;

const SOURCE_SYNONYMS: Record<string, string> = {
  employee: 'employees', staff: 'employees', manager: 'employees', gm: 'employees',
  item: 'items', items: 'items', 'item book': 'items', sku: 'items', cbi: 'items',
  'item price': 'item_prices', contract: 'item_prices', 'contract price': 'item_prices',
  invoice: 'invoices', invoices: 'invoices',
  'invoice line': 'invoice_lines', 'invoice lines': 'invoice_lines', line: 'invoice_lines',
  schedule: 'schedules', schedules: 'schedules', shift: 'schedules',
  sale: 'daily_sales', sales: 'daily_sales', 'daily sales': 'daily_sales',
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

  // strip command words / preps / filler (note we include "i")
  q = q.replace(/\b(search|find|look\s*up|lookup|show|list)\b/g, ' ');
  q = q.replace(/\b(in|from|for|within|on|of|about|with|by|at|to)\b/g, ' ');
  q = q.replace(/\b(everything|all|entire|database|records?)\b/g, ' ');
  q = q.replace(/\b(i|can|could|would|please|show|give|have|need|do|you|me|the|a|an)\b/g, ' ');

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

// ✅ Use the corrected double-d UUID you validated
const BANYAN_LOCATION_ID = '2da9f238-3449-41db-b69d-bdbd357dd496';

/* ────────────────────────── Main Route ────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    // Tolerant auth
    let user_uid: string | null = null;
    try {
      const session = await getSession(req, NextResponse.next());
      user_uid = session?.user?.sub ?? null;
    } catch { user_uid = null; }

    // Parse body → history
    const raw = await req.text();
    let parsed: any = {};
    try { parsed = raw ? JSON.parse(raw) : {}; } catch {}
    let history = sanitizeHistory(Array.isArray(parsed?.messages) ? parsed.messages : []);
    if (!history.length && typeof parsed?.message === 'string' && parsed.message.trim()) {
      history = [{ role: 'user', content: parsed.message.trim() }];
    }
    if (!history.length) return NextResponse.json({ error: 'Missing messages' }, { status: 400 });

    const lastUserMsg = history[history.length - 1]?.content ?? '';
    if (DEBUG_LOG) console.log('[MERV DEBUG] lastUserMsg:', lastUserMsg);

    // Tenant (optional)
    let tenant_id: string | null = null;
    if (user_uid) {
      const { data: vault } = await supabase
        .from('vaults_test')
        .select('*')
        .eq('user_uid', user_uid)
        .maybeSingle();
      if (vault) tenant_id = (vault as any).tenant_id ?? null;
    }

    /* ───────── EMPLOYEES: phone/email ───────── */
    if (CONTACT_INTENT.test(lastUserMsg)) {
      const nameGuess = extractName(lastUserMsg);
      const cleaned = (nameGuess || lastUserMsg)
        .replace(/(phone|number|email|contact|employee|manager|staff|gm|general manager)\b/gi, '')
        .replace(/[^\w' ]+/g, ' ')
        .trim();

      const tokens = cleaned.split(' ').filter((t) => t.length > 1).slice(0, 3);
      if (DEBUG_LOG) console.log('[MERV DEBUG][employees] tokens:', tokens);

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

      if (empErr) return NextResponse.json({ text: `Employee lookup error: ${empErr.message}` });

      if (employees && employees.length > 0) {
        const e: any = employees[0];
        const full = [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Unknown';
        const txt =
          `${full}\n` +
          (e.email ? `• Email: ${e.email}\n` : '') +
          (e.phone ? `• Phone: ${e.phone}\n` : '');
        return NextResponse.json({ text: txt.trim() });
      }

      return NextResponse.json({ text: `I couldn’t find ${cleaned || 'that person'} in employees.` });
    }

    /* ───────── SALES: robust by date (sequential awaits) ───────── */
    if (SALES_INTENT.test(lastUserMsg)) {
      const d = parseDateSmart(lastUserMsg) || new Date().toISOString().slice(0, 10);
      if (DEBUG_LOG) console.log('[MERV DEBUG][sales] date:', d);

      let row: any = null;

      try {
        // daily_sales by date with location
        let r1 = await supabase
          .from('daily_sales')
          .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
          .eq('date', d)
          .eq('location_id', BANYAN_LOCATION_ID)
          .limit(1);
        row = r1.data?.[0] ?? null;

        // daily_sales by date (any location)
        if (!row) {
          let r2 = await supabase
            .from('daily_sales')
            .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
            .eq('date', d)
            .limit(1);
          row = r2.data?.[0] ?? null;
        }

        // sales_daily by work_date with location
        if (!row) {
          let r3 = await supabase
            .from('sales_daily')
            .select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit')
            .eq('work_date', d)
            .eq('location_id', BANYAN_LOCATION_ID)
            .limit(1);
          row = r3.data?.[0] ?? null;
        }

        // sales_daily by work_date (any location)
        if (!row) {
          let r4 = await supabase
            .from('sales_daily')
            .select('work_date, net_sales, bar_sales, total_tips, comps, voids, deposit')
            .eq('work_date', d)
            .limit(1);
          row = r4.data?.[0] ?? null;
        }

        // sales_daily by date with location
        if (!row) {
          let r5 = await supabase
            .from('sales_daily')
            .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
            .eq('date', d)
            .eq('location_id', BANYAN_LOCATION_ID)
            .limit(1);
          row = r5.data?.[0] ?? null;
        }

        // sales_daily by date (any location)
        if (!row) {
          let r6 = await supabase
            .from('sales_daily')
            .select('date, net_sales, bar_sales, total_tips, comps, voids, deposit')
            .eq('date', d)
            .limit(1);
          row = r6.data?.[0] ?? null;
        }
      } catch { /* ignore */ }

      if (!row) {
        return NextResponse.json({ text: `No sales found for ${d}${BANYAN_LOCATION_ID ? ' (Banyan House)' : ''}.` });
      }

      const day = row.date || row.work_date || d;
      const txt =
        `Sales for ${day}\n` +
        `• Net Sales: $${Number(row.net_sales ?? 0).toFixed(2)}\n` +
        `• Bar Sales: $${Number(row.bar_sales ?? 0).toFixed(2)}\n` +
        (row.total_tips != null ? `• Total Tips: $${Number(row.total_tips).toFixed(2)}\n` : '') +
        (row.comps != null ? `• Comps: ${row.comps}\n` : '') +
        (row.voids != null ? `• Voids: ${row.voids}\n` : '') +
        (row.deposit != null ? `• Deposit: ${row.deposit}\n` : '');
      return NextResponse.json({ text: txt.trim() });
    }

    /* ───────── INVOICE fallback (ranked & pretty) ───────── */
    if (INVOICE_INTENT.test(lastUserMsg)) {
      const { query } = cleanQuery(lastUserMsg);
      const q = (query || lastUserMsg).trim();

      const vendorHints = ['rndc', 'republic national', 'republic national distributing'];

      const { data, error } = await supabase.rpc('rpc_search_all', {
        p_tenant: tenant_id ?? null,
        p_query: q || 'invoice',
        p_sources: ['invoices', 'invoice_lines'],
        p_limit: 50,
      });

      if (error) return NextResponse.json({ text: `Search error: ${error.message}` });
      if (!data?.length) return NextResponse.json({ text: `No invoices found for “${q || '(blank)'}”.` });

      const tokens = q.toLowerCase().split(/\s+/).filter(t => t.length > 1);

      function scoreRow(r: any): number {
        const title = (r.title || '').toLowerCase();
        const snippet = (r.snippet || '').toLowerCase();
        const meta = (r.meta || {}) as any;

        let s = 0;
        const allText = `${title} ${snippet} ${String(meta.vendor || meta.supplier || meta.vendor_name || '')}`.toLowerCase();
        if (vendorHints.some(v => allText.includes(v))) s += 3;
        for (const t of tokens) if (title.includes(t) || snippet.includes(t)) s += 1;

        let recency = 0;
        const dt = (meta.invoice_date || meta.date || meta.created_at || meta.updated_at) as string | undefined;
        if (dt) {
          const days = Math.max(0, Math.floor((Date.now() - new Date(dt).getTime()) / 86400000));
          if (days <= 30) recency = 2; else if (days <= 90) recency = 1;
        }
        s += recency;
        return s;
      }

      function money(n: any) { const v = Number(n); return Number.isFinite(v) ? `$${v.toFixed(2)}` : String(n ?? ''); }

      function fmtInvoice(r: any): string {
        const m = (r.meta || {}) as any;
        if (r.source_table === 'invoices') {
          const inv = m.invoice_no || m.invoice_number || m.number || '';
          const vendor = m.vendor || m.supplier || '';
          const date = m.invoice_date || m.date || '';
          const total = m.total != null ? money(m.total) : '';
          const core = [inv && `inv=${inv}`, vendor && `vendor=${vendor}`, date && `date=${date}`, total && `total=${total}`]
            .filter(Boolean).join(' ');
          return `• [invoices] ${r.title || 'Invoice'} — ${core}`;
        } else {
          const inv = m.invoice_no || m.invoice_number || '';
          const vendor = m.vendor || m.supplier || '';
          const date = m.invoice_date || m.date || '';
          const qty = m.qty ?? m.quantity ?? '';
          const cost = m.extended_cost != null ? money(m.extended_cost) : '';
          const sku = m.sku || m.item_code || '';
          const core = [
            (r.title || '').slice(0, 140),
            sku && `sku=${sku}`,
            qty && `qty=${qty}`,
            cost && `cost=${cost}`,
            inv && `inv=${inv}`,
            vendor && `vendor=${vendor}`,
            date && `date=${date}`
          ].filter(Boolean).join(' ');
          return `• [invoice_lines] ${core}`;
        }
      }

      const askedForRndc = vendorHints.some(v => q.toLowerCase().includes(v));
      let rows = (data || []).slice();
      if (askedForRndc) {
        const filtered = rows.filter((r: any) => {
          const m = (r.meta || {}) as any;
          const txt = `${r.title || ''} ${r.snippet || ''} ${m.vendor || m.supplier || ''}`.toLowerCase();
          return vendorHints.some(v => txt.includes(v));
        });
        if (filtered.length) rows = filtered;
      }

      rows.sort((a: any, b: any) => scoreRow(b) - scoreRow(a));
      const top = [...rows.filter((r: any) => r.source_table === 'invoices'),
                  ...rows.filter((r: any) => r.source_table === 'invoice_lines')].slice(0, 8);

      const lines = top.map(fmtInvoice).join('\n');
      const header = askedForRndc ? `Invoice results for “${q}” (RNDC):` : `Invoice results for “${q}”:`;
      return NextResponse.json({ text: `${header}\n${lines}` });
    }

    /* ───────── PRICE: from search_index (with token-AND) ───────── */
    if (PRICE_INTENT.test(lastUserMsg)) {
      const { query } = cleanQuery(lastUserMsg);
      const q = (query || lastUserMsg).trim();
      if (DEBUG_LOG) console.log('[MERV DEBUG][price] q:', q);

      const tokens = q.toLowerCase().split(/\s+/).filter(t => t && t.length > 1);

      // 1) direct index hit (substring)
      const { data: idx, error: idxErr } = await supabase
        .from('search_index')
        .select('title, meta')
        .eq('source_table', 'items')
        .or(`title.ilike.%${q}%,snippet.ilike.%${q}%`)
        .limit(15);

      if (idxErr) return NextResponse.json({ text: `Price lookup error: ${idxErr.message}` });

      let hit: any = (idx || []).find((r: any) => r?.meta && (r as any).meta?.price != null);

      // 2) token-AND pass across priced items
      if (!hit) {
        const { data: allIdx } = await supabase
          .from('search_index')
          .select('title, meta')
          .eq('source_table', 'items')
          .limit(200);

        if (allIdx && allIdx.length) {
          const candidates = allIdx
            .filter((r: any) => r?.meta && (r as any).meta?.price != null)
            .map((r: any) => {
              const title = (r.title || '').toLowerCase();
              const score = tokens.reduce((acc, t) => acc + (title.includes(t) ? 1 : 0), 0);
              return { r, score };
            })
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score);

          hit = candidates[0]?.r || null;
        }
      }

      if (hit) {
        const m: any = hit.meta || {};
        const price = Number(m.price);
        const ts    = m.price_timestamp || null;
        const vendor= m.price_vendor || null;
        const title = hit.title || 'item';
        const txt =
          `${title}\n` +
          `• Price: ${Number.isFinite(price) ? `$${price.toFixed(2)}` : String(m.price)}\n` +
          (vendor ? `• Vendor: ${vendor}\n` : '') +
          (ts ? `• As of: ${ts}\n` : '');
        return NextResponse.json({ text: txt.trim() });
      }

      // 3) last resort: rpc_search_all on items
      const { data: hits, error: rpcErr } = await supabase.rpc('rpc_search_all', {
        p_tenant: tenant_id ?? null,
        p_query: q,
        p_sources: ['items'],
        p_limit: 15,
      });
      if (rpcErr) return NextResponse.json({ text: `Price search error: ${rpcErr.message}` });

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
        return NextResponse.json({ text: txt.trim() });
      }

      return NextResponse.json({ text: `I couldn’t find a priced item that matches “${q}”.` });
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

      if (error) return NextResponse.json({ text: `Search error: ${error.message}` });
      if (!data?.length) return NextResponse.json({ text: `No results for “${query || '(blank)'}”${src ? ` in ${src.join(', ')}` : ''}.` });

      const lines = (data || []).map((r: any) => `• [${r.source_table}] ${r.title} — ${r.snippet}`).join('\n');
      return NextResponse.json({ text: `Search results for “${query}”${src ? ` in ${src.join(', ')}` : ''}:\n${lines}` });
    }

    /* ───────── Model fallback (concise) ───────── */
    const systemPrompt = `
${tenant_id ? generateVaultSummary?.({ user_uid: user_uid, tenant_id }) ?? '' : ''}
You are Merv. Be concise, factual, and owner-friendly. If a direct data answer was not found above, answer briefly without inventing numbers.
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [{ role: 'system', content: systemPrompt }, ...history],
    });

    const fallback = completion.choices?.[0]?.message?.content ?? 'Okay.';
    return NextResponse.json({ text: String(fallback) });
  } catch (err: any) {
    console.error('[MERV CHAT ERROR]', err);
    const msg = `Error: ${err?.message || String(err)}`;
    return NextResponse.json({ text: msg }, { status: 500 });
  }
}

/* Healthcheck */
export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/chat' });
}
