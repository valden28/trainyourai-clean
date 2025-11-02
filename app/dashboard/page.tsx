'use client';

import React, { useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// --- small UI helpers so this file compiles standalone ---
function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 bg-white shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value ?? '—'}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <div className="border-b px-4 py-2 font-semibold">{title}</div>
      <div className="p-4 overflow-x-auto">{children}</div>
    </div>
  );
}

function Table({ rows, columns }: { rows: any[]; columns: string[] }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left text-gray-600">
          {columns.map((c) => (
            <th key={c} className="px-2 py-1 border-b">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {safeRows.length === 0 ? (
          <tr><td className="px-2 py-3 text-gray-400" colSpan={columns.length}>No data</td></tr>
        ) : (
          safeRows.map((r, i) => (
            <tr key={i} className="odd:bg-gray-50">
              {columns.map((c) => (
                <td key={c} className="px-2 py-1 border-b">
                  {fmt(r?.[c])}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function fmtCurrency(n: any) {
  if (n == null || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}
function fmt(n: any) {
  if (n == null) return '—';
  if (typeof n === 'number') return n.toLocaleString();
  // try to render dates nicely
  if (typeof n === 'string' && /^\d{4}-\d{2}-\d{2}/.test(n)) {
    return new Date(n).toLocaleDateString();
  }
  return String(n);
}
// ---------------------------------------------------------

export default function OwnerDashboard() {
  const defaultMonth = new Date().toISOString().slice(0, 7) + '-01';
  const [month, setMonth] = useState<string>(defaultMonth);
  const [locationId, setLocationId] = useState<string | undefined>(undefined);

  const qpLoc = locationId ? `&locationId=${locationId}` : '';

  const { data: kpiRes } = useSWR(`/api/owner/kpis?month=${month}${qpLoc}`, fetcher);
  const { data: varRes } = useSWR(`/api/owner/variance-top?month=${month}&location=Banyan%20House`, fetcher);
  const { data: alertRes } = useSWR(`/api/owner/alerts?month=${month}${qpLoc}`, fetcher);

  const kpi = kpiRes?.rows?.[0];

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <div className="flex gap-3 items-center">
        <label className="text-sm text-gray-600">Month</label>
        <input
          type="month"
          value={month.slice(0, 7)}
          onChange={(e) => setMonth(e.target.value + '-01')}
          className="border rounded px-2 py-1"
        />
        {/* If you want a location selector, wire it up here and setLocationId(...) */}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Revenue" value={fmtCurrency(kpi?.revenue)} />
        <Kpi label="Food + Bar COGS %" value={
          kpi?.food_bev_pct != null
            ? `${(Number(kpi.food_bev_pct) * 100).toFixed(1)}%`
            : '—'
        } />
        <Kpi label="Labor %" value={
          kpi?.labor_pct != null
            ? `${(Number(kpi.labor_pct) * 100).toFixed(1)}%`
            : '—'
        } />
        <Kpi label="Prime Cost %" value={
          kpi?.prime_cost_pct != null
            ? `${(Number(kpi.prime_cost_pct) * 100).toFixed(1)}%`
            : '—'
        } />
      </div>

      {/* Grids */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Top Variances ($)">
          <Table
            rows={varRes?.rows ?? []}
            columns={['rnk','description','variance_cost','actual_qty','theoretical_qty']}
          />
        </Card>

        <Card title="Contract / Price Alerts">
          <Table
            rows={alertRes?.rows ?? []}
            columns={['day','note','new_price','prev_price','pct_change','kind']}
          />
        </Card>
      </div>
    </div>
  );
}
     
