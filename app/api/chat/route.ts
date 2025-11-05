// /app/api/chat/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ---- CONFIG ----
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-side
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const TENANT_ID = '2300fba0-6736-4c15-8f2b-3071385c7113';       // D&D Restaurants (current tenant)

// Names you actually use in the DB
const TABLES = {
  dailySales: 'daily_sales',
  contacts: 'contacts',
  employees: 'employees',
  roles: 'employee_roles',
  locations: 'locations',
  vaults: 'vaults_test',
};

// Optional: pre-declared RPCs (created earlier in SQL)
const RPC = {
  kpis: 'rpc_sales_kpis',
  ts: 'rpc_sales_timeseries',
  rank: 'rpc_sales_rank',
};

// ---- UTIL ----
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
  // Expand with your common aliases
  const catalog = [
    'banyan house',
    'prime port charlotte',
    'prime steakhouse',
    'bocca lupo',
    'acqua pazza',
    'donatos', 'donato’s'
  ];
  const text = q.toLowerCase();
  return catalog.filter(name => text.includes(name))
                .map(n => n.replace('donato’s','donatos'));
}

// ---- DATA LAYER ----
function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}

async function resolveLocationIds(sb: ReturnType<typeof supabaseAdmin>, names: string[]) {
  if (!names?.length) return null;
  const { data, error } = await sb
    .from(TABLES.locations)
    .select('id,name')
    .in('name', names.map(n => n.replace(/\b\w/g, c => c.toUpperCase()))) // naive Title Case
  ;
  if (error) throw error;
  return (data ?? []).map(r => r.id);
}

async function fetchContactsSummary(sb: ReturnType<typeof supabaseAdmin>) {
  const { data, error } = await sb
    .from(TABLES.contacts)
    .select('id, full_name, title, email, phone, location_id')
    .limit(200);
  if (error) throw error;
  return data ?? [];
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

  // Try contacts first
  const { data: c, error: e2 } = await sb
    .from(TABLES.contacts)
    .select('full_name, title, email, phone')
    .eq('location_id', loc.id)
    .ilike('title', '%manager%')
    .limit(1);
  if (e2) throw e2;
  if (c && c[0]) return { location: loc.name, ...c[0] };

  // Fallback to employees/roles if you maintain manager roles there
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
  return { location: loc.name, full_name: emp?.[0]?.full_name ?? 'Unknown', title: r[0].role, email: emp?.[0]?.email ?? null, phone: emp?.[0]?.phone ?? null };
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

// Simple last-30 fallback if RPCs aren’t present yet
async function fallbackDailySum(sb: ReturnType<typeof supabaseAdmin>, tenant: string, start: string, end: string, locationIds: string[] | null) {
  let q = sb.from(TABLES.dailySales)
    .select('net_sales, bar_sales, total_tips', { head: false, count: 'exact' })
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

// ---- OPENAI (optional polish) ----
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function polishAnswer(system: string, content: string) {
  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-5.1-mini', // or your preferred
      messages: [
        { role: 'system', content: system },
        { role: 'user', content }
      ],
      temperature: 0.2,
    });
    return r.choices?.[0]?.message?.content?.trim() || content;
  } catch {
    return content;
  }
}

// ---- MAIN HANDLER ----
export async function POST(req: NextRequest) {
  try {
    const { message, user_id } = await req.json() as { message: string; user_id?: string };

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Connect to Supabase (server-side / service key)
    const sb = supabaseAdmin();

    // Optional: derive tenant from vaults/user if you need multi-tenant switching
    // For now we use the fixed TENANT_ID. You can uncomment below if you store per-user tenant in vaults_test.
    // const { data: vault } = await sb.from(TABLES.vaults).select('tenant_id').eq('user_id', user_id ?? '').limit(1).maybeSingle();
    // const tenant = vault?.tenant_id ?? TENANT_ID;

    const tenant = TENANT_ID;
    const intent = detectIntent(message);
    const locNames = pickLocationsFromText(message);
    const locIds = await resolveLocationIds(sb, locNames);

    // Date window defaults: last 30 days
    const end = ymd(new Date());
    const start = ymd(new Date(Date.now() - 29 * 86400000));

    // INTENT ROUTING
    if (intent === 'who') {
      // e.g., "Who is the Banyan House manager?"
      const nameGuess = locNames[0] ?? 'Banyan House';
      const mgr = await fetchManagerByLocation(sb, nameGuess);
      const plain = mgr
        ? `${mgr.full_name} is the ${mgr.title} at ${mgr.location}. ${mgr.email ? `Email: ${mgr.email}. `:''}${mgr.phone ? `Phone: ${mgr.phone}.`:''}`
        : `I couldn’t find a manager for ${nameGuess}.`;
      const polished = await polishAnswer(
        'Answer as a concise operations assistant. Prefer factual, direct responses.',
        plain
      );
      return NextResponse.json({ text: polished, meta: { intent, manager: mgr } });
    }

    if (intent === 'rank') {
      const dim = message.toLowerCase().includes('location') ? 'location' : 'date';
      const dir = message.toLowerCase().includes('lowest') || message.toLowerCase().includes('bottom') ? 'asc' : 'desc';
      const limitMatch = message.match(/top\s+(\d+)/i);
      const limit = limitMatch ? Number(limitMatch[1]) : 5;

      let rows: any[] = [];
      try {
        rows = await rpcRank(sb, tenant, start, end, dim as any, limit, dir as any);
      } catch {
        // fallback: very small inline query
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
          rows = byLoc.slice(0, limit);
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
          byDay.sort((a: any, b: any) => (dir === 'asc' ? a.net_sales - b.net_sales : b.net_sales - a.net_sales));
          rows = byDay.slice(0, limit);
        }
      }

      const lines = rows.map(r => `• ${r.key}: ${money(r.net_sales)}`).join('\n');
      const plain = `${dim === 'location' ? 'Top locations' : 'Top days'} ${start} → ${end}\n${lines}`;
      const polished = await polishAnswer('Be concise and owner-friendly.', plain);
      return NextResponse.json({ text: polished, meta: { intent, dim, start, end, rows } });
    }

    if (intent === 'timeseries') {
      let rows: any[] = [];
      try {
        rows = await rpcTimeseries(sb, tenant, start, end, locIds, 'day');
      } catch {
        // fallback: inline
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
      const polished = await polishAnswer('Be concise and owner-friendly.', plain);
      return NextResponse.json({ text: polished, meta: { intent, start, end, rows } });
    }

    if (intent === 'compare') {
      // Simple compare: this month vs last month
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
      const polished = await polishAnswer('Be concise and owner-friendly.', plain);
      return NextResponse.json({ text: polished, meta: { intent, thisMonth: A, lastMonth: B } });
    }

    // Default: KPIs (last 30 days)
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
    const polished = await polishAnswer('Be concise and owner-friendly.', plain);

    return NextResponse.json({ text: polished, meta: { intent: 'kpis', start, end, kpis: r } });

  } catch (err: any) {
    console.error('chat route error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unhandled error' }, { status: 500 });
  }
}
