import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/* ----------  ENV / CONSTANTS  ---------- */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

const TENANT_ID = '2300fba0-6736-4c15-8f2b-3071385c7113'

const TABLES = {
  dailySales: 'daily_sales',
  contacts: 'contacts',
  employees: 'employees',
  roles: 'employee_roles',
  locations: 'locations',
  vaults: 'vaults_test',
}

const RPC = {
  kpis: 'rpc_sales_kpis',
  ts: 'rpc_sales_timeseries',
  rank: 'rpc_sales_rank',
}

/* ----------  UTILS  ---------- */
const sbAdmin = () =>
  createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const money = (n: any) =>
  n == null || isNaN(Number(n))
    ? '—'
    : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
const pct = (n: any) =>
  n == null || isNaN(Number(n)) ? '—' : `${(Number(n) * 100).toFixed(1)}%`

const detectIntent = (q: string) => {
  const m = q.toLowerCase()
  if (m.includes('who') || m.includes('manager') || m.includes('contact')) return 'who'
  if (m.includes('compare') || m.includes(' vs ')) return 'compare'
  if (m.includes('top') || m.includes('lowest') || m.includes('rank')) return 'rank'
  if (m.includes('trend') || m.includes('chart') || m.includes('daily')) return 'timeseries'
  return 'kpis'
}

const pickLocationsFromText = (q: string) => {
  const catalog = [
    'banyan house',
    'prime steakhouse',
    'prime port charlotte',
    'bocca lupo',
    'acqua pazza',
    'donatos',
    'donato’s',
  ]
  const text = q.toLowerCase()
  return catalog.filter(n => text.includes(n)).map(n => n.replace('donato’s', 'donatos'))
}

/* ----------  SUPABASE HELPERS  ---------- */
async function resolveLocationIds(sb: any, names?: string[] | null) {
  if (!names?.length) return null
  const { data, error } = await sb
    .from(TABLES.locations)
    .select('id,name')
    .in('name', names.map(n => n.replace(/\b\w/g, c => c.toUpperCase())))
  if (error) throw error
  return (data ?? []).map((r: any) => r.id)
}

async function fetchContactByName(sb: any, nameLike: string) {
  const { data, error } = await sb
    .from(TABLES.contacts)
    .select(
      `
      full_name,
      title,
      email,
      phone,
      location_id,
      locations (
        name
      )
    `
    )
    .ilike('full_name', `%${nameLike}%`)
    .limit(5)
  if (error) throw error
  return data ?? []
}

async function fetchManagerByLocation(sb: any, locName: string) {
  const { data: locs } = await sb
    .from(TABLES.locations)
    .select('id,name')
    .eq('name', locName)
    .limit(1)
  const loc = locs?.[0]
  if (!loc) return null

  const { data: c } = await sb
    .from(TABLES.contacts)
    .select('full_name,title,email,phone')
    .eq('location_id', loc.id)
    .ilike('title', '%manager%')
    .limit(1)
  if (c && c[0]) return { location: loc.name, ...c[0] }

  const { data: r } = await sb
    .from(TABLES.roles)
    .select('employee_id,role,location_id')
    .eq('location_id', loc.id)
    .ilike('role', '%manager%')
    .limit(1)
  if (!r || !r[0]) return { location: loc.name, full_name: 'Unknown', title: 'Manager' }

  const { data: e } = await sb
    .from(TABLES.employees)
    .select('full_name,email,phone')
    .eq('id', r[0].employee_id)
    .limit(1)
  return {
    location: loc.name,
    full_name: e?.[0]?.full_name ?? 'Unknown',
    title: r[0].role,
    email: e?.[0]?.email ?? null,
    phone: e?.[0]?.phone ?? null,
  }
}

/* ----------  RPC HELPERS  ---------- */
async function rpcKpis(sb: any, tenant: string, start: string, end: string, locs: string[] | null) {
  const { data } = await sb.rpc(RPC.kpis, {
    p_tenant: tenant,
    p_start: start,
    p_end: end,
    p_locations: locs,
  })
  return data?.[0] ?? null
}

async function rpcTimeseries(
  sb: any,
  tenant: string,
  start: string,
  end: string,
  locs: string[] | null,
  grain: 'day' | 'week' | 'month'
) {
  const { data } = await sb.rpc(RPC.ts, {
    p_tenant: tenant,
    p_start: start,
    p_end: end,
    p_locations: locs,
    p_grain: grain,
  })
  return data ?? []
}

async function rpcRank(
  sb: any,
  tenant: string,
  start: string,
  end: string,
  dim: 'date' | 'location',
  limit = 5,
  dir: 'asc' | 'desc' = 'desc'
) {
  const { data } = await sb.rpc(RPC.rank, {
    p_tenant: tenant,
    p_start: start,
    p_end: end,
    p_dim: dim,
    p_limit: limit,
    p_dir: dir,
  })
  return data ?? []
}

async function fallbackDailySum(sb: any, tenant: string, start: string, end: string, locs: string[] | null) {
  let q = sb.from(TABLES.dailySales).select('net_sales,bar_sales,total_tips').eq('tenant_id', tenant)
  if (locs?.length) q = q.in('location_id', locs)
  q = q.gte('date', start).lte('date', end)
  const { data } = await q
  const totals = (data ?? []).reduce(
    (a: any, r: any) => {
      a.net += Number(r.net_sales || 0)
      a.bar += Number(r.bar_sales || 0)
      a.tips += Number(r.total_tips || 0)
      return a
    },
    { net: 0, bar: 0, tips: 0 }
  )
  const days = Math.max(1, (data ?? []).length)
  return {
    days,
    total_sales: totals.net,
    avg_day_sales: totals.net / days,
    total_bar: totals.bar,
    avg_bar: totals.bar / days,
    total_tips: totals.tips,
    tip_rate: totals.net > 0 ? totals.tips / totals.net : null,
  }
}

/* ----------  OPENAI POLISH  ---------- */
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null
async function polishAnswer(system: string, content: string) {
  if (!openai) return content
  try {
    const r = await openai.chat.completions.create({
      model: 'gpt-5.1-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
      temperature: 0.2,
    })
    return r.choices?.[0]?.message?.content?.trim() || content
  } catch {
    return content
  }
}

/* ----------  HANDLER  ---------- */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text()
    let body: any = {}
    try { body = raw ? JSON.parse(raw) : {} } catch { body = {} }

    const message =
      body.message ??
      body.prompt ??
      body.text ??
      (Array.isArray(body.messages) ? body.messages.at(-1)?.content : undefined)
    const user_id = body.user_id ?? body.userId ?? null

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const sb = sbAdmin()
    const tenant = TENANT_ID
    const intent = detectIntent(message)
    const locNames = pickLocationsFromText(message)
    const locIds = await resolveLocationIds(sb, locNames)
    const end = ymd(new Date())
    const start = ymd(new Date(Date.now() - 29 * 86400000))

    /* ----------  WHO  ---------- */
    if (intent === 'who') {
      const nameQuery = message.replace(/\?+$/, '').trim()
      const hits = await fetchContactByName(sb, nameQuery)

      if (hits.length) {
        const c = hits[0] as any
        // ✅ unified location handling (no duplicate declaration)
        const locName =
          Array.isArray(c.locations)
            ? c.locations[0]?.name
            : c.locations?.name ?? 'Unknown Location'

        const txt =
          `${c.full_name} — ${c.title || 'Role N/A'} at ${locName}` +
          `${c.email ? `, ${c.email}` : ''}${c.phone ? `, ${c.phone}` : ''}.`

        return NextResponse.json({ text: txt, meta: { intent, contact: c } })
      }

      const guess = locNames[0] ?? 'Banyan House'
      const mgr = await fetchManagerByLocation(sb, guess)
      const plain = mgr
        ? `${mgr.full_name} is the ${mgr.title} at ${mgr.location}.`
        : `I couldn’t find a manager for ${guess}.`
      const polished = await polishAnswer('Be concise.', plain)
      return NextResponse.json({ text: polished, meta: { intent, manager: mgr } })
    }

    /* ----------  RANK  ---------- */
    if (intent === 'rank') {
      const dim: 'date' | 'location' = message.includes('location') ? 'location' : 'date'
      const dir: 'asc' | 'desc' = message.includes('lowest') ? 'asc' : 'desc'
      const limitMatch = message.match(/top\s+(\d+)/i)
      const limit = limitMatch ? Number(limitMatch[1]) : 5
      let rows = await rpcRank(sb, tenant, start, end, dim, limit, dir)
      const lines = rows.map((r: any) => `• ${r.key}: ${money(r.net_sales)}`).join('\n')
      const text = `${dim === 'location' ? 'Top locations' : 'Top days'} ${start}→${end}\n${lines}`
      const polished = await polishAnswer('Be concise.', text)
      return NextResponse.json({ text: polished, meta: { intent, rows } })
    }

    /* ----------  TIMESERIES  ---------- */
    if (intent === 'timeseries') {
      const rows = await rpcTimeseries(sb, tenant, start, end, locIds, 'day')
      const total = rows.reduce((a: number, r: any) => a + Number(r.net_sales || 0), 0)
      const plain = `Daily sales ${start}→${end}: ${rows.length} days, total ${money(total)}.`
      const polished = await polishAnswer('Be concise.', plain)
      return NextResponse.json({ text: polished, meta: { intent, rows } })
    }

    /* ----------  COMPARE  ---------- */
    if (intent === 'compare') {
      const now = new Date()
      const thisStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      const nextStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
      const lastStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
      const lastEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))

      const A =
        (await rpcKpis(sb, tenant, ymd(thisStart), ymd(new Date(nextStart.getTime() - 86400000)), locIds)) ??
        (await fallbackDailySum(sb, tenant, ymd(thisStart), ymd(new Date(nextStart.getTime() - 86400000)), locIds))
      const B =
        (await rpcKpis(sb, tenant, ymd(lastStart), ymd(lastEnd), locIds)) ??
        (await fallbackDailySum(sb, tenant, ymd(lastStart), ymd(lastEnd), locIds))

      const delta = (A?.total_sales ?? 0) - (B?.total_sales ?? 0)
      const rate = (B?.total_sales ?? 0) > 0 ? delta / (B?.total_sales ?? 1) : null
      const plain =
        `Comparison\n` +
        `• Last month: ${money(B?.total_sales)}\n` +
        `• This month: ${money(A?.total_sales)} ${
          rate == null ? '' : `(${(rate >= 0 ? '+' : '') + (rate * 100).toFixed(1)}%)`
        }\n` +
        `• Tip rate: ${pct(A?.tip_rate)} vs ${pct(B?.tip_rate)}`
      const polished = await polishAnswer('Be concise.', plain)
      return NextResponse.json({ text: polished, meta: { intent, A, B } })
    }

    /* ----------  DEFAULT KPI  ---------- */
    const kpis =
      (await rpcKpis(sb, tenant, start, end, locIds)) ??
      (await fallbackDailySum(sb, tenant, start, end, locIds))
    const plain =
      `From ${start}→${end}:\n` +
      `• Net sales: ${money(kpis?.total_sales)} (avg/day ${money(kpis?.avg_day_sales)})\n` +
      `• Bar sales: ${money(kpis?.total_bar)} (avg/day ${money(kpis?.avg_bar)})\n` +
      `• Tips: ${money(kpis?.total_tips)} (tip rate ${pct(kpis?.tip_rate)})`
    const polished = await polishAnswer('Be concise.', plain)
    return NextResponse.json({ text: polished, meta: { intent: 'kpis', kpis } })
  } catch (err: any) {
    console.error('chat route error:', err)
    return NextResponse.json({ error: err.message || 'Unhandled error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, route: '/api/chat' })
}
