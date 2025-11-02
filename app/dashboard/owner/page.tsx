// app/owner/page.tsx  (sketch)
'use client';
import useSWR from 'swr';
import { useState } from 'react';

export default function OwnerDashboard() {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0,7)+'-01');
  const [locationId, setLocationId] = useState<string|undefined>(undefined);

  const { data: kpis } = useSWR(`/api/owner/kpis?month=${month}${locationId?`&locationId=${locationId}`:''}`);
  const { data: variance } = useSWR(`/api/owner/variance-top?month=${month}&location=Your%20Location%20Name`);
  const { data: alerts } = useSWR(`/api/owner/alerts?month=${month}${locationId?`&locationId=${locationId}`:''}`);

  return (
    <div className="p-6 space-y-6">
      {/* Filters: month + location selector */}
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Revenue" value={fmtCurrency(kpis?.rows?.[0]?.revenue)} />
        <Kpi label="Food% / Bev%" value={`${pct(kpis?.rows?.[0]?.food_bev_pct)} / ${pct(kpis?.rows?.[0]?.labor_pct)}`} />
        <Kpi label="Prime Cost %" value={pct(kpis?.rows?.[0]?.prime_cost_pct)} />
        <Kpi label="Alerts (Contract/Spike)" value={`${kpis?.rows?.[0]?.contract_breach_cnt || 0} / ${kpis?.rows?.[0]?.price_spike_cnt || 0}`} />
      </div>

      {/* Charts */}
      <section className="grid md:grid-cols-2 gap-6">
        <Card title="Top Variances ($)">
          <Table rows={variance?.rows} columns={['rnk','description','variance_cost','actual_qty','theoretical_qty']} />
        </section>
        <Card title="Contract Breaches & Price Alerts">
          <Table rows={alerts?.rows} columns={['day','note','new_price','prev_price','pct_change','kind']} />
        </Card>
      </section>

      {/* Buttons */}
      <div className="flex gap-3">
        <a href={`/api/reports/run?templateCode=monthly_owner&month=${month}${locationId?`&locationId=${locationId}`:''}`}
           className="btn btn-primary">Download Owner PDF</a>
      </div>
    </div>
  );
}
