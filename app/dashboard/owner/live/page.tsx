'use client'

import Filters from '@/components/dashboard/filters'
import KPIRow from '@/components/dashboard/KPIRow'
import { useSearchParams } from 'next/navigation'

export default function OwnerLive() {
  const sp = useSearchParams()
  const get = (k:string) => (sp ? sp.get(k) : null)

  const scope  = (get('scope') as 'store'|'group'|'company') || 'store'
  const code   = get('code') || (scope==='store' ? 'BANYAN' : scope==='group' ? 'PRIME' : 'ALL')
  const hz     = (get('hz') as 'WTD'|'WEEK') || 'WTD'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Owner · Live KPIs</h1>
        <Filters />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide opacity-70">
          {hz === 'WTD' ? 'Week-to-date' : 'This Week'} · {scope === 'store' ? code : scope === 'group' ? `${code} Group` : 'Company'}
        </h2>
        <KPIRow scope={scope} code={code} horizon={hz} />
      </section>

      {/* TODO: add Trend, PMIX leaders, Category COGS, Price Spikes here next */}
    </div>
  )
}
