import FilterBar from '@/components/dashboard/FilterBar'
import KPIRow from '@/components/dashboard/KPIRow'

export default function OwnerDashboard({ searchParams }: { searchParams: any }) {
  const scope = (searchParams.scope ?? 'store') as 'store'|'group'|'company'
  const code  = (searchParams.code  ?? (scope==='store'?'BANYAN': scope==='group'?'PRIME':'ALL')) as string
  const hz    = (searchParams.hz    ?? 'WTD') as 'WTD'|'WEEK'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Owner · KPIs</h1>
        <FilterBar />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm uppercase tracking-wide opacity-70">
          {hz==='WTD' ? 'Week-to-date' : 'This Week'} · {scope==='store' ? code : scope==='group' ? `${code} Group` : 'Company'}
        </h2>
        <KPIRow scope={scope} code={code} horizon={hz} />
      </section>

      {/* TODO: Add TrendCard, PMIX leaders, Category COGS, Price spikes components using the same filter state */}
    </div>
  )
}
