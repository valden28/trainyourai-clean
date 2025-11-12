import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month') // YYYY-MM-01
  const locationId = searchParams.get('locationId') // optional UUID

  if (!month) {
    return NextResponse.json({ error: 'month is required (YYYY-MM-01)' }, { status: 400 })
  }

  // pull monthly store rows; if no locationId, sum all stores
  const { data, error } = await supabase
    .from('v_kpi_monthly_store')
    .select('*')
    .eq('month_start', month)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = locationId ? (data||[]).filter(r => r.location_id === locationId) : (data||[])

  // roll up
  const sum = <T extends number>(arr: any[], key: string) =>
    arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0) as T

  const netSales   = sum<number>(rows, 'net_sales$')
  const cogsActual = sum<number>(rows, 'cogs_actual$')
  const labor      = sum<number>(rows, 'labor$')
  const foodActual = sum<number>(rows, 'food_actual$') // if you prefer purchases, use cogs_actual$

  const resp = {
    rows: [{
      revenue: netSales,
      food_bev_pct: netSales > 0 ? cogsActual / netSales : null,   // “Food+Bar %” using purchases COGS
      labor_pct:    netSales > 0 ? labor / netSales : null,
      prime_cost_pct: netSales > 0 ? (foodActual + labor) / netSales : null
    }]
  }
  return NextResponse.json(resp)
}
