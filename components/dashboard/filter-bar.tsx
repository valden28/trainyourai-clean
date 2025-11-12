'use client'
import { useRouter, useSearchParams } from 'next/navigation'
type Scope = 'store'|'group'|'company'
type Horizon = 'WTD'|'WEEK'
const STORES  = ['BANYAN','PRIME_PC','PRIME_VE','BL_PC','BL_NP','BL_WP','DONATOS','ACQUA']
const GROUPS  = ['PRIME','BL','ALL']

export default function FilterBar() {
  const router = useRouter()
  const sp = useSearchParams()
  const scope:Scope   = (sp.get('scope') as Scope)   || 'store'
  const code          = sp.get('code')               || (scope==='store'?'BANYAN': scope==='group'?'PRIME':'ALL')
  const hz:Horizon    = (sp.get('hz') as Horizon)    || 'WTD'

  const options = scope==='store' ? STORES : scope==='group' ? GROUPS : ['ALL']
  const setQ = (k:string,v:string) => {
    const q = new URLSearchParams(sp.toString())
    q.set(k,v)
    if (k==='scope') q.set('code', v==='store'?'BANYAN': v==='group'?'PRIME':'ALL')
    router.replace(`/dashboard/owner?${q.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select className="border rounded px-3 py-1" value={scope} onChange={e=>setQ('scope', e.target.value)}>
        <option value="store">Store</option><option value="group">Group</option><option value="company">Company</option>
      </select>
      <select className="border rounded px-3 py-1" value={code} onChange={e=>setQ('code', e.target.value)}>
        {options.map(o=> <option key={o} value={o}>{o}</option>)}
      </select>
      <select className="border rounded px-3 py-1" value={hz} onChange={e=>setQ('hz', e.target.value)}>
        <option value="WTD">WTD</option><option value="WEEK">This Week</option>
      </select>
    </div>
  )
}
