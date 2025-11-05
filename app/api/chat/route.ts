// app/api/chat/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

/* =========================
   ENV / CONSTANTS
   ========================= */
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!; // SERVER-ONLY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// Current tenant (D&D Restaurants). If you store tenant per user in vaults later, swap this at runtime.
const TENANT_ID = '2300fba0-6736-4c15-8f2b-3071385c7113';

// DB table names (centralized so you can rename later)
const TABLES = {
  dailySales: 'daily_sales',        // canonical sales table
  contacts:   'contacts',
  employees:  'employees',
  roles:      'employee_roles',
  locations:  'locations',
  vaults:     'vaults_test',
} as const;

// RPC names (created earlier). If missing, code falls back to direct queries.
const RPC = {
  kpis: 'rpc_sales_kpis',
  ts:   'rpc_sales_timeseries',
  rank: 'rpc_sales_rank',
} as const;

/* =========================
   UTILITIES
   ========================= */
function sbAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}

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
  if (m.includes('who') || m.includes('manager') || m.includes('contact')) return 'who';
  if (m.includes('compare') || m.includes(' vs ')) return 'compare';
  if (m.includes('top') || m.includes('lowest') || m.includes('rank')) return 'rank';
  if (m.includes('trend') || m.includes('chart') || m.includes('daily') || m.includes('timeseries')) return 'timeseries';
  return 'kpis';
}

function pickLocationsFromText(q: string) {
  // Expand with your real-world aliases as you go
  const catalog = [
    'banyan house',
    'prime steakhouse',
    'prime port charlotte',
    'bocca lupo',
    'acqua pazza',
    'donatos', 'donato’s',
  ];
  const text = q.toLowerCase();
  return catalog
    .filter(name => text.includes(name))
    .map(n => n.replace('donato’s', 'donatos'));
}

/* =========================
   SUPABASE HELPERS
   ========================= */
async function resolveLocationIds(sb: ReturnType<typeof sbAdmin>, names: string[] | undefined | null) {
  if (!names?.length) return null;
  // try exact name match first
  const { data, error } = await sb
    .from(TABLES.locations)
    .select('id, name')
    .in('name', names.map(n => n.replace(/\b\w/g, c => c.toUpperCase())));
  if (error) throw error;
  return (data ?? []).map(r => r.id);
}

async function fetchContactByName(sb: ReturnType<typeof sbAdmin>, nameLike: string) {
  const { data, error } = await sb
    .from(TABLES.contacts)
    .select('full_name, title, email, phone, location_id, locations!inner(name)')
    .ilike('full_name', `%${nameLike}%`)
    .limit(5);
  if (error) throw error;
  return data ?? [];
}

async function fetchManagerByLocation(sb: ReturnType<typeof sbAdmin>, locationName: string) {
  // resolve location
  const { data: locs, error: e1 } = await sb
    .from(TABLES.locations)
    .select('id, name')
    .eq('name', locationName)
    .limit(1);
  if (e1) throw e1;
  const loc = locs?.[0];
  if (!loc) return null;

  // prefer contacts table with "manager" in title
  const { data: c, error: e2 } = await sb
    .from(TABLES.contacts)
    .select('full_name, title, email, phone')
    .eq('location_id', loc.id)
    .ilike('title', '%manager%')
    .limit(1);
  if (e2) throw e2;
  if (c && c[0]) return { location: loc.name, ...c[0] };

  // fallback to employees/roles if present
  const { data: r, error: e3 } = await sb
    .from(TABLES.roles)
    .select('employee_id, role, location_id')
    .eq('location_id', loc.id)
    .ilike('role', '%manager%')
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
    phone: emp?.[0]?.phone ?? null,
  };
}

/* =========================
   SALES RPCs + FALLBACKS
   ========================= */
async function rpcKpis(
  sb: ReturnType<typeof sbAdmin>,
  tenant: string,
  start: string,
  end: string,
  locationIds: string[] | null
) {
  const { data, error } = await sb.rpc(RPC.kpis, {
    p_tenant: tenant,
    p_start: start,
    p_end: end,
    p_locations: locationIds,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

async function rpcTimeseries(
  sb: ReturnType<typeof sbAdmin>,
  tenant: string,
  start: string,
  end: string,
  locationIds: string[] | null,
  grain: 'day' | 'week' | 'month'
) {
  const { data, error } = await sb.rpc(RPC.ts, {
    p_tenant: tenant,
    p_start: start,
    p_end: end,
    p_locations: locationIds,
    p_grain: grain,
  });
  if (error) throw error;
  return data ?? [];
}

async function rpcRank(
  sb: ReturnType<typeof sbAdmin>,
  tenant: string,
  start: string,
  end: string,
  dim: 'date' | 'location',
  limit = 5,
  dir: 'asc' | 'desc' = 'desc'
) {
  const { data, error } = await sb.rpc(RPC.rank, {
    p_tenant: tenant,
    p_start: start,
    p_end: end,
    p_dim: dim,
    p_limit: limit,
    p_dir: dir,
  });
  if (error) throw error;
  return data ?? [];
}

// Fallback aggregation if RPCs aren’t available
async function fallbackDailySum(
  sb: ReturnType<typeof sbAdmin>,
  tenant: string,
  start: string,
  end: string,
  locationIds: string[] | null
) {
  let q = sb
    .from(TABLES.dailySales)
    .select('net_sales, bar_sales, total_tips')
    .eq('tenant_id', tenant)
    .gte('date', start)
    .lte('date', end);

  if (locationIds?.length) q = q.in('location_id', locationIds);

  const { data, error } = await q;
  if (error) throw error;

  const totals = (data ?? []).reduce(
    (a: any, r: any) => {
      a.net += Number(r.net_sales || 0);
      a.bar += Number(r.bar_sales || 0);
      a.tips += Number(r.total_tips || 0);
      return a;
    },
    { net: 0, bar: 0, tips: 0 }
  );

  const days = Math.max(1, (data ?? []).length);
  return {
    days,
    total_sales: totals.net,
    avg_day_sales: totals.net / days,
    total_bar: totals.bar,
    avg_bar: totals.bar / days,
    total_tips: totals.tips,
    tip_rate: totals.net > 0 ? totals.tips / totals.net : null,
  };
}

/* =========================
   OPENAI POLISH (optional)
   ========================= */
const openai =
  OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

async function polishAnswer(system: string, content: string) {
  if (!openai) return content;
  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-5.1-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
      temperature: 0.2,
    });
    return r.choices?.[0]?.message?.content?.trim() || content;
  } catch {
    return content;
  }
}

/* =========================
   HTTP HANDLER
   ========================= */
export async function POST(req: NextRequest) {
  try {
    // Robust body parsing (accepts {message}, {prompt}, {text}, OpenAI {messages}, or raw string)
    const raw = await req.text();
    let body: any = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = raw;
    }

    const message =
      (typeof body === 'object' && (body.message ?? body.prompt ?? body.text)) ??
      (Array.isArray((body as any)?.messages) ? (body as any).messages.at(-1)?.content : undefined) ??
      (typeof body === 'string' ? body : undefined);

    const user_id =
      (typeof body === 'object' && (body.user_id ?? body.userId ?? body.uid)) || null;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Connect to Supabase (service role)
    const sb = sbAdmin();

    // If/when you store tenant per user, fetch it from vaults_test here.
    // const { data: vault } = await sb
    //   .from(TABLES.vaults)
    //   .select('tenant_id')
    //   .eq('user_id', user_id ?? '')
    //   .maybeSingle();
    // const tenant = vault?.tenant_id ?? TENANT_ID;
    const tenant = TENANT_ID;

    const intent = detectIntent(message);
    const locNames = pickLocationsFromText(message);
    const locIds = await resolveLocationIds(sb, locNames);

    // Default date window: last 30 days
    const end = ymd(new Date());
    const start = ymd(new Date(Date.now() - 29 * 86400000));

    /* ---------- WHO (contacts) ---------- */
    if (intent === 'who') {
      // try contact by name first (e.g., “Who is Stacy Jones?”)
      const nameQuery = message.replace(/\?+$/, '').trim();
      const words = nameQuery.split(/\s+/).slice(0, 5).join(' ');
      const hits = await fetchContactByName(sb, words);
      if (hits.length) {
        const c = hits[0];
        const txt =
          `${c.full_name} — ${c.title || 'Role N/A'} at ${c.locations?.name || 'Unknown Location'}` +
          `${c.email ? `, ${c.email}` : ''}${c.phone ? `, ${c.phone}` : ''}.`;
        return NextResponse.json({ text: txt, meta: { intent, contact: c } });
      }

      // fallback: manager by location (e.g., “Who is the Banyan House manager?”)
      const guess = locNames[0] ?? 'Banyan House';
      const mgr = await fetchManagerByLocation(sb, guess);
      const plain = mgr
        ? `${mgr.full_name} is the ${mgr.title} at ${mgr.location}. ${mgr.email ? `Email: ${mgr.email}. ` : ''}${mgr.phone ? `Phone: ${mgr.phone}.` : ''}`
        : `I couldn’t find a manager for ${guess}.`;
      const polished = await polishAnswer('Be concise and factual for an operations owner.', plain);
      return NextResponse.json({ text: polished, meta: { intent, manager: mgr } });
    }

    /* ---------- RANK ---------- */
    if (intent === 'rank') {
      const dim: 'date' | 'location' = message.toLowerCase().includes('location') ? 'location' : 'date';
      const dir: 'asc' | 'desc' = (message.toLowerCase().includes('lowest') || message.toLowerCase().includes('bottom')) ? 'asc' : 'desc';
      const limitMatch = message.match(/top\s+(\d+)/i);
      const limit = limitMatch ? Number(limitMatch[1]) : 5;

      let rows: any[] = [];
      try {
        rows = await rpcRank(sb, tenant, start, end, dim, limit, dir);
      } catch {
        // Minimal fallback
        if (dim === 'location') {
          const { data } = await sb
            .from(TABLES.dailySales)
            .select('net_sales, location_id, locations!inner(name)')
            .eq('tenant_id', tenant)
            .gte('date', start).lte('date', end);
          const grouped = Object.values((data ?? []).reduce((acc: any, r: any) => {
            const key = r.locations?.name ?? r.location_id;
            acc[key] = acc[key] || { key, net_sales: 0 };
            acc[key].net_sales += Number(r.net_sales || 0);
            return acc;
          }, {}));
          grouped.sort((a: any, b: any) => (dir === 'asc' ? a.net_sales - b.net_sales : b.net_sales - a.net_sales));
          rows = grouped.slice(0, limit);
        } else {
          const { data } = await sb
            .from(TABLES.dailySales)
            .select('date, net_sales')
            .eq('tenant_id', tenant)
            .gte('date', start).lte('date', end);
          const grouped = Object.values((data ?? []).reduce((acc: any, r: any) => {
            const key = r.date;
            acc[key] = acc[key] || { key, net_sales: 0 };
            acc[key].net_sales += Number(r.net_sales || 0);
            return acc;
          }, {}));
          grouped.sort((a: any, b: any) => (dir === 'asc' ? a.net_sales - b.net_sales : b.net_sales - a.net_sales));
          rows = grouped.slice(0, limit);
        }
      }

      const lines = rows.map(r => `• ${r.key}: ${money(r.net_sales)}`).join('\n');
      const plain = `${dim === 'location' ? 'Top locations' : 'Top days'} ${start} → ${end}\n${lines}`;
      const polished = await polishAnswer('Be concise and owner-friendly.', plain);
      return NextResponse.json({ text: polished, meta: { intent, dim, start, end, rows } });
    }

    /* ---------- TIMESERIES ---------- */
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
      const polished = await polishAnswer('Be concise and owner-friendly.', plain);
      return NextResponse.json({ text: polished, meta: { intent, start, end, rows } });
    }

    /* ---------- COMPARE (this month vs last month) ---------- */
    if (intent === 'compare') {
      const now = new Date();
      const thisStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      const lastStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const lastEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));

      const thisMonth = await (async () => {
        try { return await rpcKpis(sb, tenant, ymd(thisStart), ymd(new Date(nextStart.getTime() - 86400000)), locIds); }
        catch { return await fallbackDailySum(sb, tenant, ymd(thisStart), ymd(new Date(nextStart.getTime() - 86400000)), locIds); }
      })();

      const prevMonth = await (async () => {
        try { return await rpcKpis(sb, tenant, ymd(lastStart), ymd(lastEnd), locIds); }
        catch { return await fallbackDailySum(sb, tenant, ymd(lastStart), ymd(lastEnd), locIds); }
      })();

      const delta = (thisMonth?.total_sales ?? 0) - (prevMonth?.total_sales ?? 0);
      const rate = (prevMonth?.total_sales ?? 0) > 0 ? delta / (prevMonth?.total_sales ?? 1) : null;

      const plain =
        `Comparison\n` +
        `• Last month: ${money(prevMonth?.total_sales)}\n` +
        `• This month: ${money(thisMonth?.total_sales)} ${rate == null ? '' : `(${(rate >= 0 ? '+' : '') + (rate * 100).toFixed(1)}%)`}\n` +
        `• Tip rate: ${pct(thisMonth?.tip_rate)} vs ${pct(prevMonth?.tip_rate)}`;
      const polished = await polishAnswer('Be concise and owner-friendly.', plain);
      return NextResponse.json({ text: polished, meta: { intent, thisMonth, prevMonth } });
    }

    /* ---------- DEFAULT: KPIs (last 30 days) ---------- */
    let kpis: any;
    try {
      kpis = await rpcKpis(sb, tenant, start, end, locIds);
    } catch {
      kpis = await fallbackDailySum(sb, tenant, start, end, locIds);
    }

    const plain =
      `From ${start} to ${end}:\n` +
      `• Net sales: ${money(kpis?.total_sales)} (avg/day ${money(kpis?.avg_day_sales)})\n` +
      `• Bar sales: ${money(kpis?.total_bar)} (avg/day ${money(kpis?.avg_bar)})\n` +
      `• Tips: ${money(kpis?.total_tips)} (tip rate ${pct(kpis?.tip_rate)})`;
    const polished = await polishAnswer('Be concise and owner-friendly.', plain);

    return NextResponse.json({ text: polished, meta: { intent: 'kpis', start, end, kpis } });
  } catch (err: any) {
    console.error('[/api/chat] error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unhandled error' }, { status: 500 });
  }
}

/* Optional: GET for quick health check */
export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/chat' });
}
