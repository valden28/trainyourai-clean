'use client';

import React, { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// High-contrast KPI card
function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-700">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value ?? '—'}</div>
    </div>
  );
}

export default function OwnerDashboard() {
  const defaultMonth = new Date().toISOString().slice(0, 7) + '-01';
  const [month, setMonth] = useState<string>(defaultMonth);
  const [locationId] = useState<string | undefined>(undefined);

  const qpLoc = locationId ? '&locationId=' + locationId : '';
  const { data: kpiRes }   = useSWR('/api/owner/kpis?month=' + month + qpLoc, fetcher);
  const { data: varRes }   = useSWR('/api/owner/variance-top?month=' + month + '&location=Banyan%20House', fetcher);
  const { data: alertRes } = useSWR('/api/owner/alerts?month=' + month + qpLoc, fetcher);

  const kpi  = kpiRes?.rows?.[0];
  const vars = varRes?.rows ?? [];
  const alts = alertRes?.rows ?? [];

  return (
    <div className="p-6 space-y-6 text-neutral-900">
      {/* Filters */}
      <div className="flex gap-3 items-center">
        <label className="text-sm text-neutral-800">Month</label>
        <input
          type="month"
          value={month.slice(0, 7)}
          onChange={(e) => setMonth(e.target.value + '-01')}
          className="border border-slate-400 text-neutral-900 placeholder-neutral-500 rounded px-2 py-1 bg-white"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi
          label="Revenue"
          value={Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
            .format(kpi?.revenue ?? 0)}
        />
        <Kpi
          label="Food+Bar %"
          value={kpi?.food_bev_pct != null ? (Number(kpi.food_bev_pct) * 100).toFixed(1) + '%' : '—'}
        />
        <Kpi
          label="Labor %"
          value={kpi?.labor_pct != null ? (Number(kpi.labor_pct) * 100).toFixed(1) + '%' : '—'}
        />
        <Kpi
          label="Prime %"
          value={kpi?.prime_cost_pct != null ? (Number(kpi.prime_cost_pct) * 100).toFixed(1) + '%' : '—'}
        />
      </div>

      {/* Temporary debug */}
      <pre className="text-xs bg-white text-neutral-900 border border-slate-300 rounded p-3 overflow-x-auto">
        {JSON.stringify({ variance_rows: vars.length, alert_rows: alts.length }, null, 2)}
      </pre>
    </div>
  );
}
