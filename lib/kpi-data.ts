import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export async function fetchKPI(scope:'store'|'group'|'company', code:string, horizon:'WTD'|'WEEK'){
  // Store
  if (scope==='store'){
    if (horizon==='WTD'){
      const { data, error } = await supabase.from('v_kpi_wtd_store').select('*').eq('location_code', code)
      if (error) throw error; return data
    } else {
      const { data, error } = await supabase.from('v_kpi_weekly_store').select('*')
      if (error) throw error; return (data||[]).filter((r:any)=> r.location_code===code &&
        r.week_start === r.week_start /* keep latest week client-side or add RPC for week_start_wed(current_date) */)
    }
  }
  // Group & company (company is group_code='ALL')
  const view = horizon==='WTD' ? 'v_kpi_wtd_group' : 'v_kpi_weekly_group'
  const gc   = scope==='company' ? 'ALL' : code
  const { data, error } = await supabase.from(view).select('*').eq('group_code', gc)
  if (error) throw error; return data
}
