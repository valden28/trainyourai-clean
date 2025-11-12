'use client'
import { useEffect, useState } from 'react'
import { fetchKPI } from '@/lib/data'

type Props = { scope: 'store'|'group'|'company', code: string, horizon: 'WTD'|'WEEK' }

export function KPIRow({ scope, code, horizon }: Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string|undefined>()

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchKPI(scope, code, horizon).then(d=>{
      if (mounted) { setData(d||[]); setLoading(false) }
    }).catch(e=>{ setErr(e.message); setLoading(false) })
    return ()=>{ mounted=false }
  }, [scope, code, horizon])

  if (loading) return <div className="text-sm opacity-70">Loading…</div>
  if (err) return <div className="text-red-600">{err}</div>
  const row = data[0]
  if (!row) return <div className="text-sm opacity-70">No data yet.</div>

  // Field names differ between store/group views, so pick safely
  const sales  = row.net_sales$ ?? row.net_sales
  const foodA  = row.food_actual$ ?? 0
  const foodI  = row.food_ideal$ ?? 0
  const labor  = row.labor$ ?? 0
  const cogsP  = row.cogs_purchases$ ?? row.cogs_actual$ ?? 0
  const ppg    = row.price_per_guest$ ?? row.avg_check$ ?? null
  const comps  = row.comps$ ?? null
  const compPct= row.comp_pct ?? null

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Card title="Net Sales" value={fmt(sales)} />
      <Card title="Food Actual" value={fmt(foodA)} sub={pct(foodA,sales)} />
      <Card title="Food Ideal" value={fmt(foodI)} sub={pct(foodI,sales)} />
      <Card title="Labor" value={fmt(labor)} sub={pct(labor,sales)} />
      <Card title="COGS (Purch)" value={fmt(cogsP)} sub={pct(cogsP,sales)} />
      <Card title={scope==='store' && code.startsWith('BL_') ? 'Price / Pizza' : 'Price / Guest'} value={ppg ? `$${ppg.toFixed(2)}` : '—'} />
      {comps !== null && <Card title="Comps" value={fmt(comps)} sub={compPct !== null ? `${compPct.toFixed(2)}%` : '—'} />}
    </div>
  )
}

function Card({title, value, sub}:{title:string, value:string, sub?:string}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs uppercase tracking-wide opacity-70">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  )
}
const fmt = (n:number)=> isFinite(n) ? n.toLocaleString(undefined,{style:'currency',currency:'USD'}) : '—'
const pct = (part:number, whole:number)=> (whole>0 && isFinite(part)) ? `${((part/whole)*100).toFixed(1)}%` : '—'
