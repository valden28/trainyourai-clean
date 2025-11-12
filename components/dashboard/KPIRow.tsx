'use client'
import { useEffect, useState } from 'react'
import { fetchKPI } from '@/lib/kpi-data'

export default function KPIRow({ scope, code, horizon }:{
  scope:'store'|'group'|'company', code:string, horizon:'WTD'|'WEEK'
}) {
  const [row,setRow] = useState<any|null>(null)
  const [err,setErr] = useState<string|undefined>()
  useEffect(()=>{
    let live = true
    fetchKPI(scope, code, horizon).then(d=>{ if(live) setRow(d?.[0]||null) }).catch(e=> setErr(e.message))
    return ()=>{ live=false }
  },[scope,code,horizon])

  if (err) return <div className="text-red-600 text-sm">{err}</div>
  if (!row) return <div className="text-sm opacity-70">No data yet.</div>

  const sales  = row.net_sales$ ?? row.net_sales ?? 0
  const foodA  = row.food_actual$ ?? 0
  const foodI  = row.food_ideal$ ?? 0
  const labor  = row.labor$ ?? 0
  const cogsP  = row.cogs_purchases$ ?? row.cogs_actual$ ?? 0
  const avg    = row.price_per_guest$ ?? row.avg_check$ ?? null
  const comps$ = row.comps$ ?? null
  const compPct= row.comp_pct ?? null

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <Card title="Net Sales" value={money(sales)} />
      <Card title="Food Actual" value={money(foodA)} sub={pct(foodA,sales)} />
      <Card title="Food Ideal"  value={money(foodI)} sub={pct(foodI,sales)} />
      <Card title="Labor"       value={money(labor)} sub={pct(labor,sales)} />
      <Card title="COGS (Purch)"value={money(cogsP)} sub={pct(cogsP,sales)} />
      <Card title="Avg Check"   value={avg!=null ? `$${Number(avg).toFixed(2)}` : '—'} />
      {comps$!=null && <Card title="Comps" value={money(comps$)} sub={compPct!=null ? `${Number(compPct).toFixed(2)}%` : '—'} />}
    </div>
  )
}
function Card({title,value,sub}:{title:string,value:string,sub?:string}) {
  return <div className="rounded-lg border p-4"><div className="text-xs uppercase opacity-70">{title}</div>
    <div className="text-xl font-semibold">{value}</div>{sub && <div className="text-xs opacity-70">{sub}</div>}</div>
}
const money=(n:number)=> isFinite(n)? n.toLocaleString(undefined,{style:'currency',currency:'USD'}):'—'
const pct=(p:number,w:number)=> (w>0 && isFinite(p))? `${((p/w)*100).toFixed(1)}%`:'—'
