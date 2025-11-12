'use client'
import { useRouter, useSearchParams } from 'next/navigation'

type Scope = 'store' | 'group' | 'company'
type Horizon = 'WTD' | 'WEEK'

const STORES  = ['BANYAN','PRIME_PC','PRIME_VE','BL_PC','BL_NP','BL_WP','DONATOS','ACQUA'] as const
const GROUPS  = ['PRIME','BL','ALL'] as const

export default function Filters() {
  const router = useRouter()
  const params = useSearchParams()

  // Build-safe getters (handle SSR / null)
  const get = (k: string) => (params ? params.get(k) : null)

  const scope: Scope = (get('scope') as Scope) || 'store'
  const codeDefault  = scope === 'store' ? 'BANYAN' : scope === 'group' ? 'PRIME' : 'ALL'
  const code         = get('code') || codeDefault
  const hz: Horizon  = (get('hz') as Horizon) || 'WTD'

  const options = scope === 'store' ? STORES : scope === 'group' ? GROUPS : (['ALL'] as const)

  const setQ = (k: string, v: string) => {
    const current = params ? new URLSearchParams(params.toString()) : new URLSearchParams()
    current.set(k, v)
    if (k === 'scope') current.set('code', v === 'store' ? 'BANYAN' : v === 'group' ? 'PRIME' : 'ALL')
    router.replace(`/dashboard/owner?${current.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select className="border rounded px-3 py-1" value={scope} onChange={e => setQ('scope', e.target.value)}>
        <option value="store">Store</option>
        <option value="group">Group</option>
        <option value="company">Company</option>
      </select>

      <select className="border rounded px-3 py-1" value={code} onChange={e => setQ('code', e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>

      <select className="border rounded px-3 py-1" value={hz} onChange={e => setQ('hz', e.target.value)}>
        <option value="WTD">WTD</option>
        <option value="WEEK">This Week</option>
      </select>
    </div>
  )
}
