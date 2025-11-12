import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function fetchKPI(scope: 'store'|'group'|'company', code: string, horizon: 'WTD'|'WEEK') {
  if (scope === 'store') {
    if (horizon === 'WTD') {
      // v_kpi_wtd_store returns all stores; filter in JS or SQL
      const { data, error } = await supabase.from('v_kpi_wtd_store').select('*').eq('location_code', code)
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase.from('v_kpi_weekly_store')
        .select('*')
        .eq('week_start', 'week_start_wed(current_date)') // Note: for PostgREST you might expose an RPC; or filter client-side from all rows
      if (error) throw error
      return (data||[]).filter((r:any)=>r.location_code===code)
    }
  } else if (scope === 'group') {
    if (code === 'ALL') {
      // treat as company
      const { data, error } = await supabase.from(horizon==='WTD' ? 'v_kpi_wtd_group' : 'v_kpi_weekly_group')
        .select('*').eq('group_code','ALL')
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase.from(horizon==='WTD' ? 'v_kpi_wtd_group' : 'v_kpi_weekly_group')
        .select('*').eq('group_code', code)
      if (error) throw error
      return data
    }
  } else { // company
    const { data, error } = await supabase.from(horizon==='WTD' ? 'v_kpi_wtd_group' : 'v_kpi_weekly_group')
      .select('*').eq('group_code','ALL')
    if (error) throw error
    return data
  }
}
