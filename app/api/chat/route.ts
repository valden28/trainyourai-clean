// /app/api/chat/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ====== RUNTIME (Node, not Edge, because we use a service key) ======
export const dynamic = 'force-dynamic';

// ====== CONFIG ======
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!; // keep server-only
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';     // optional
const TENANT_ID = '2300fba0-6736-4c15-8f2b-3071385c7113';     // D&D Restaurants

const TABLES = {
  dailySales: 'daily_sales',
  contacts: 'contacts',
  employees: 'employees',
  roles: 'employee_roles',
  locations: 'locations',
  vaults: 'vaults_test',
};

const RPC = {
  kpis: 'rpc_sales_kpis',
  ts: 'rpc_sales_timeseries',
  rank: 'rpc_sales_rank',
};

// ====== SMALL HELPERS ======
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function money(n: any) {
  if (n == null) return '—';
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function pct(n: any) {
  if (n == null) return '—';
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  return `${(v * 100).toFixed(1)}%`;
}
function detectIntent(q: string) {
  const m = q.toLowerCase();
  if (m.includes('top') || m.includes('lowest') || m.includes('rank')) return 'rank';
  if (m.includes('trend') || m.includes('chart') || m.includes('daily') || m.includes('timeseries')) return 'timeseries';
  if (m.includes('compare') || m.includes('vs ')) return 'compare';
  if (m.includes('who') || m.includes('manager') || m.includes('contact')) return 'who';
  return 'kpis';
}
function pickLocationsFromText(q: string) {
  const catalog = [
    'banyan house',
    'prime port charlotte',
    'prime steakhouse',
    'bocca lupo',
    'acqua pazza',
    'donatos', 'donato’s'
  ];
  const text = q.toLowerCase();
  return catalog
    .filter(name => text.includes(name))
    .map(n => n.replace('donato’s','donatos'));
}

// ====== DATA LAYER ======
function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}
async function resolveLocationIds(sb: ReturnType<typeof supabaseAdmin>, names: string[]) {
  if (!names?.length) return null;
  const toTitle = (s: string) => s.replace(/\b\w/g, c => c.toUpperCase());
  const { data, error } = await sb
    .from(TABLES.locations)
    .select('id,name')
    .in('name', names.map(toTitle));
  if (error) throw error;
  return (data ?? []).map(r => r.id);
}
async function fetchManagerByLocation(sb: ReturnType<typeof supabaseAdmin>, locationName: string) {
  const { data: locs, error: e1 } = await sb
    .from(TABLES.locations)
    .select('id,name')
    .eq('name', locationName)
    .limit(1);
  if (e1) throw e1;
  const loc = locs?.[0];
  if (!loc) return null;

  const { data: c, error: e2 } = await sb
    .from(TABLES.contacts)
    .select('full_name, title, email, phone')
    .eq('location_id', loc.id)
    .ilike('title', '%manager%')
    .limit(1);
  if (e2) throw e2;
  if (c && c[0]) return { location: loc.name, ...c[0] };

  const { data: r, error: e3 } = await sb
    .from(TABLES.roles)
    .select('employee_id, role, location_id')
    .eq('location_id', loc.id)
    .ilike('role','%manager%')
    .limit(1);
  if (e3) throw e3;
  if (!r || !r[0]) return { location: loc.name, full_name: 'Unknown', title: 'Manager', email: null, phone: null };

  const { data: emp, error: e4 } = await sb
    .from(TABLES.employees)
    .select('full_name, email, phone')
    .eq('id', r[0].employee_id)
    .limit(1);
  if (e4) throw e4;
  return {
    location: loc.name,
    full_name: emp?.[0]?.full_name ?? 'Unknown',
    title: r[0].role,
    email: emp?.[0]?.email ?? null,
    phone: emp?.[0]?.phone ?? null
  };
}
async function rpcKpis(sb: ReturnType<typeof supabaseAdmin>, tenant: string, start: string, end: string, locationIds: string[] | null) {
  const { data, error } = await sb.rpc(RPC.kpis, { p_tenant: tenant, p_start: start, p_end: end, p_locations: locationIds });
  if (error) throw error;
  return data?.[0] ?? null;
}
async function rpcTimeseries(sb: ReturnType<typeof supabaseAdmin>, tenant: string, start: string, end: string, locationIds: string[] | null, grain: 'day'|'week'|'month') {
  const { data, error } = await sb.rpc(RPC.ts, { p_tenant: tenant, p_start: start, p_end: end, p_locations: locationIds, p_grain: grain });
  if (error) throw error;
  return data ?? [];
}
async function rpcRank(sb: ReturnType<typeof supabaseAdmin>, tenant: string, start: string, end: string, dim: 'date'|'location', limit = 5, dir: 'asc'|'desc' = 'desc') {
  const { data, error } = await sb.rpc(RPC.rank, { p_tenant: tenant, p_start: start, p_end: end, p_dim: dim, p_limit: limit, p_dir: dir });
  if (error) throw error;
  return data ?? [];
}
async function fallbackDailySum(sb: ReturnType<typeof supabaseAdmin>, tenant: string, start: string, end: string, locationIds: string[] | null) {
  let q = sb.from(TABLES.dailySales)
    .select('net_sales, bar_sales, total_tips')
    .eq('tenant_id', tenant)
    .gte('date', start)
    .lte('date', end);
  if (locationIds?.length) q = q.in('location_id', locationIds);
  const { data, error } = await q;
  if (error) throw error;

  const totals = (data ?? []).reduce((a: any, r: any) => {
    a.net += Number(r.net_sales || 0);
    a.bar += Number(r.bar_sales || 0);
    a.tips += Number(r.total_tips || 0);
    return a;
  }, { net: 0, bar: 0, tips: 0 });

  const days = Math.max(1, (data ?? []).length);
  return {
    days,
    total_sales: totals.net,
    avg_day_sales: totals.net / days,
    total_bar: totals.bar,
    avg_bar: totals.bar / days,
    total_tips: totals.tips,
    tip_rate: totals.net > 0 ? (totals.tips / totals.net) : null
  };
}

// ====== OPTIONAL OPENAI POLISH ======
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
async function maybePolish(plain: string) {
  if (!openai) return plain; // no key = skip polish
  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // small, cheap, safe default
      messages: [
        { role: 'system', content: 'Be concise and owner-friendly. Return only the answer text.' },
        { role: 'user', content: plain }
      ],
      temperature: 0.2
    });
    return r.choices?.[0]?.message?.content?.trim() || plain;
  } catch {
    return plain;
  }
}

// ====== CORS ======
function cors(json: any, status = 200) {
  return new NextResponse(JSON.stringify(json), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
export function OPTIONS() {
  return cors({ ok: true });
}

// ====== HEALTH (simple GET) ======
export async function GET() {
  const ok = Boolean(SUPABASE_URL && SUPABASE_KEY);
  return cors({ ok, service: 'chat-route', supabase: !!SUPABASE_URL });
}

// ====== MAIN (POST) ======
export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return cors({ error: 'Server missing Supabase env vars' }, 500);
    }

    // Accept any of these shapes:
    // { message: "text" }
    // { q: "text" }
    // { messages: [{role, content}, ...] }
    const body = await (async () => {
      try { return await req.json(); } catch { return {}; }
    })();

    let message: string | undefined =
      (typeof body?.message === 'string' && body.message) ||
      (typeof body?.q === 'string' && body.q) ||
      (Array.isArray(body?.messages) && body.messages.find((m: any) => m?.role === 'user')?.content);

    message = (message || '').toString().trim();

    if (!message) {
      // the error you saw before—now it explains how to fix on client
      return cors({ error: 'Message is required. Send { message: "your text" }.' }, 400);
    }

    const sb = supabaseAdmin();
    const tenant = TENANT_ID;

    const intent = detectIntent(message);
    const locNames = pickLocationsFromText(message);
    const locIds = await resolveLocationIds(sb, locNames).catch(() => null);

    const end = ymd(new Date());
    const start = ymd(new Date(Date.now() - 29 * 86400000));

    // ---- WHO / MANAGER LOOKUP ----
    if (intent === 'who') {
      const guess = locNames[0] ?? 'Banyan House';
      const mgr = await fetchManagerByLocation(sb, guess);
      const plain = mgr
        ? `${mgr.full_name} is the ${mgr.title} at ${mgr.location}. ${mgr.email ? `Email: ${mgr.email}. `:''}${mgr.phone ? `Phone: ${mgr.phone}.`:''}`
        : `I couldn’t find a manager for ${guess}.`;
      const text = await maybePolish(plain);
      return cors({ ok: true, text, meta: { intent, manager: mgr } });
    }

    // ---- RANK ----
    if (intent === 'rank') {
      const dim = message.toLowerCase().includes('location') ? 'location' : 'date';
      const dir = (message.toLowerCase().includes('lowest') || message.toLowerCase().includes('bottom')) ? 'asc' : 'desc';
      const limitMatch = message.match(/top\s+(\d+)/i);
      const limit = limitMatch ? Number(limitMatch[1]) : 5;

      let rows: any[] = [];
      try {
        rows = await rpcRank(sb, tenant, start, end, dim as any, limit, dir as any);
      } catch {
        // tiny fallback
        if (dim === 'location') {
          const { data } = await sb
            .from(TABLES.dailySales)
            .select('net_sales, location_id, locations!inner(name)')
            .eq('tenant_id', tenant)
            .gte('date', start).lte('date', end);
          const byLoc = Object.values((data ?? []).reduce((acc: any, r: any) => {
            const key = r.locations?.name ?? r.location_id;
            acc[key] = acc[key] || { key, net_sales: 0 };
            acc[key].net_sales += Number(r.net_sales || 0);
            return acc;
          }, {}));
          byLoc.sort((a: any, b: any) => (dir === 'asc' ? a.net_sales - b.net_sales : b.net_sales - a.net_sales));
          rows = (byLoc as any[]).slice(0, limit);
        } else {
          const { data } = await sb
            .from(TABLES.dailySales)
            .select('date, net_sales')
            .eq('tenant_id', tenant)
            .gte('date', start).lte('date', end);
          const byDay = Object.values((data ?? []).reduce((acc: any, r: any) => {
            const key = r.date;
            acc[key] = acc[key] || { key, net_sales: 0 };
            acc[key].net_sales += Number(r.net_sales || 0);
            return acc;
          }, {}));
          (byDay as any[]).sort((a: any, b: any) => (dir === 'asc' ? a.net_sales - b.net_sales : b.net_sales - a.net_sales));
          rows = (byDay as any[]).slice(0, limit);
        }
      }

      const lines = rows.map((r: any) => `• ${r.key}: ${money(r.net_sales)}`).join('\n');
      const plain = `${dim === 'location' ? 'Top locations' : 'Top days'} ${start} → ${end}\n${lines}`;
      const text = await maybePolish(plain);
      return cors({ ok: true, text, meta: { intent, dim, start, end, rows } });
    }

    // ---- TIMESERIES ----
    if (intent === 'timeseries') {
      let rows: any[] = [];
      try {
        rows = await rpcTimeseries(sb, tenant, start, end, locIds, 'day');
      } catch {
        const { data, error } = await sb
          .from(TABLES.dailySales)
          .select('date, net_sales, bar_sales, total_tips')
          .eq('tenant_id', tenant)
          .gte('date', start).lte('date', end)
          .order('date');
        if (error) throw error;
        rows = data ?? [];
      }
      const total = rows.reduce((a, r) => a + Number(r.net_sales || 0), 0);
      const plain = `Daily sales ${start} → ${end}: ${rows.length} days, total ${money(total)}.`;
      const text = await maybePolish(plain);
      return cors({ ok: true, text, meta: { intent, start, end, rows } });
    }

    // ---- COMPARE (this month vs last month) ----
    if (intent === 'compare') {
      const now = new Date();
      const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));

      const A = await (async () => {
        try {
          return await rpcKpis(sb, tenant, ymd(thisMonthStart), ymd(new Date(nextMonthStart.getTime() - 86400000)), locIds);
        } catch {
          return await fallbackDailySum(sb, tenant, ymd(thisMonthStart), ymd(new Date(nextMonthStart.getTime() - 86400000)), locIds);
        }
      })();

      const B = await (async () => {
        try {
          return await rpcKpis(sb, tenant, ymd(lastMonthStart), ymd(lastMonthEnd), locIds);
        } catch {
          return await fallbackDailySum(sb, tenant, ymd(lastMonthStart), ymd(lastMonthEnd), locIds);
        }
      })();

      const delta = (A?.total_sales ?? 0) - (B?.total_sales ?? 0);
      const rate = (B?.total_sales ?? 0) > 0 ? delta / (B?.total_sales ?? 1) : null;

      const plain =
        `Comparison\n` +
        `• Last month: ${money(B?.total_sales)}\n` +
        `• This month: ${money(A?.total_sales)} ${rate == null ? '' : `(${(rate >= 0 ? '+' : '') + (rate * 100).toFixed(1)}%)`}\n` +
        `• Tip rate: ${pct(A?.tip_rate)} vs ${pct(B?.tip_rate)}`;
      const text = await maybePolish(plain);
      return cors({ ok: true, text, meta: { intent, thisMonth: A, lastMonth: B } });
    }

    // ---- DEFAULT: KPIs (last 30 days) ----
    let r: any;
    try {
      r = await rpcKpis(sb, tenant, start, end, locIds);
    } catch {
      r = await fallbackDailySum(sb, tenant, start, end, locIds);
    }
    const plain =
      `From ${start} to ${end}:\n` +
      `• Net sales: ${money(r?.total_sales)} (avg/day ${money(r?.avg_day_sales)})\n` +
      `• Bar sales: ${money(r?.total_bar)} (avg/day ${money(r?.avg_bar)})\n` +
      `• Tips: ${money(r?.total_tips)} (tip rate ${pct(r?.tip_rate)})`;
    const text = await maybePolish(plain);

    return cors({ ok: true, text, meta: { intent: 'kpis', start, end, kpis: r } });

  } catch (err: any) {
    console.error('chat route error:', err);
    return cors({ error: err?.message ?? 'Unhandled error' }, 500);
  }
}
