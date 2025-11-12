import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM-01
  const location = searchParams.get('location') // optional (e.g., "Banyan House")
  if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 })

  const monthStart = new Date(month)
  const monthEnd = new Date(monthStart)
  monthEnd.setMonth(monthEnd.getMonth() + 1)

  // fetch all weekly rows, filter to weeks inside month, then group
  const { data, error } = await supabase.from('v_top_variance_items_weekly').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const insideMonth = (r: any) => {
    const ws = new Date(r.week_start)
    return ws >= monthStart && ws < monthEnd
  }

  const filtered = (data||[])
    .filter(insideMonth)
    .filter(r => !location || (r.location_code || '').toLowerCase().includes(location.toLowerCase()) )

  // Aggregate by item across the month
  const byKey = new Map<string, any>()
  for (const r of filtered) {
    const key = `${r.location_id}-${r.item_id}`
    const cur = byKey.get(key) || { ...r, variance$: 0, purchases$:0, ideal$:0 }
    cur.variance$ += Number(r.variance$) || 0
    cur.purchases$+= Number(r.purchases$) || 0
    cur.ideal$    += Number(r.ideal$) || 0
    byKey.set(key, cur)
  }

  const rows = Array.from(byKey.values()).sort((a,b) => (b.variance$||0) - (a.variance$||0)).slice(0, 20)
  return NextResponse.json({ rows })
}
