import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const month = searchParams.get('month')
  const locationId = searchParams.get('locationId') // optional
  if (!month) return NextResponse.json({ error: 'month is required' }, { status: 400 })

  const monthStart = new Date(month)
  const monthEnd = new Date(monthStart); monthEnd.setMonth(monthEnd.getMonth()+1)

  const { data, error } = await supabase.from('v_item_price_spike_alerts').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data||[])
    .filter(r => {
      const d = new Date(r.week_start)
      return d >= monthStart && d < monthEnd
    })
    .filter(r => !locationId || r.location_id === locationId)
    .sort((a,b)=> Math.abs(b.delta_pct||0) - Math.abs(a.delta_pct||0))
    .slice(0, 50)

  return NextResponse.json({ rows })
}
