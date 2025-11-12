'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

const STORES = ['BANYAN','PRIME_PC','PRIME_VE','BL_PC','BL_NP','BL_WP','DONATOS','ACQUA'] as const
const GROUPS = ['PRIME','BL','ALL'] as const
type Scope = 'store' | 'group' | 'company'
type Horizon = 'WTD' | 'WEEK'

export function FilterBar() {
  const router = useRouter()
  const params = useSearchParams()
  const scope = (params.get('scope') as Scope) || 'store'
  const code  = params.get('code') || 'BANYAN'
  const hz    = (params.get('hz') as Horizon) || 'WTD'

  const selectorOptions = useMemo(() => {
    if (scope === 'store') return STORES
    if (scope === 'group') return ['PRIME','BL','ALL']
    return ['ALL']
  }, [scope])

  const onChange = (k: string, v: string) => {
    const q = new URLSearchParams(params.toString())
    q.set(k, v)
    if (k === 'scope') {
      // reset code sensibly when scope changes
      q.set('code', v === 'store' ? 'BANYAN' : (v === 'group' ? 'PRIME' : 'ALL'))
    }
    router.replace(`/dashboard?${q.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select value={scope} onChange={e=>onChange('scope', e.target.value)} className="border rounded px-3 py-1">
        <option value="store">Store</option>
        <option value="group">Group</option>
        <option value="company">Company</option>
      </select>

      <select value={code} onChange={e=>onChange('code', e.target.value)} className="border rounded px-3 py-1">
        {selectorOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>

      <select value={hz} onChange={e=>onChange('hz', e.target.value)} className="border rounded px-3 py-1">
        <option value="WTD">WTD</option>
        <option value="WEEK">This Week</option>
      </select>
    </div>
  )
}
