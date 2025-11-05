'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';

const fetcher = (u: string) => fetch(u).then(r => r.json());

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
  const safe = Array.isArray(rows) ? rows : [];
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left text-gray-600">
          {columns.map(c => <th key={c} className="px-2 py-1 border-b">{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {safe.length === 0 ? (
          <tr><td className="px-2 py-3 text-gray-400" colSpan={columns.length}>No data</td></tr>
        ) : safe.map((r, i) => (
          <tr key={i} className="odd:bg-gray-50">
            {columns.map(c => <td key={c} className="px-2 py-1 border-b">{fmt(r?.[c])}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function fmt(n: any) {
  if (n == null) return '—';
  if (typeof n === 'number') return n.toLocaleString(undefined,{ maximumFractionDigits: 2 });
  if (typeof n === 'string' && /^\d{4}-\d{2}-\d{2}/.test(n)) return new Date(n).toLocaleDateString();
  return String(n);
}
function money(n: any) {
  if (n == null || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function LaborDashboard() {
  const [location] = useState<string>('Banyan House');

  // Build URLs without nested backticks
  const qs = '?location=' + encodeURIComponent(location);
  const { data: sumRes } = useSWR('/api/labor/summary' + qs, fetcher);
  const { data: empRes } = useSWR('/api/labor/employee' + qs, fetcher);
  const { data: rosRes } = useSWR('/api/roster/banyan', fetcher);

  const rows = sumRes?.rows ?? [];
  const latest = rows[0] || {};

  // KPIs (latest day)
  const kpi = useMemo(() => ({
    schedH: latest?.sched_hours ?? latest?.scheduled_hours ?? 0,
    actH:   latest?.actual_hours ?? 0,
    varH:   latest?.hours_variance ?? 0,
    sched$: latest?.sched_payroll_est ?? 0,
    act$:   latest?.actual_payroll ?? 0,
    var$:   (latest?.actual_payroll ?? 0) - (latest?.sched_payroll_est ?? 0)
  }), [latest]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Luna · Labor & Scheduling</h1>
      <p className="text-gray-600">Location: {location}</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Kpi label="Scheduled Hrs" value={fmt(kpi.schedH)} />
        <Kpi label="Actual Hrs"    value={fmt(kpi.actH)} />
        <Kpi label="Hours Var"     value={fmt(kpi.varH)} />
        <Kpi label="Sched $"       value={money(kpi.sched$)} />
        <Kpi label="Actual $"      value={money(kpi.act$)} />
        <Kpi label="Payroll Var $" value={money(kpi.var$)} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Last 14 days · Scheduled vs Actual (hrs)">
          <Table
            rows={(rows || []).slice(0,14).map((r: any) => ({
              work_date: r.work_date,
              scheduled: r.sched_hours ?? r.scheduled_hours,
              actual:    r.actual_hours,
              variance:  r.hours_variance
            }))}
            columns={['work_date','scheduled','actual','variance']}
          />
        </Card>

        <Card title="Top Employee Variances (by $)">
          <Table
            rows={(empRes?.rows ?? []).slice(0,20).map((r: any) => ({
              employee_id: r.employee_id,
              sched_hours: r.sched_hours ?? r.scheduled_hours,
              actual_hours: r.actual_hours,
              hours_variance: r.hours_variance,
              sched_payroll_est: r.sched_payroll_est,
              actual_payroll: r.actual_payroll,
              payroll_variance: r.payroll_variance
            }))}
            columns={['employee_id','sched_hours','actual_hours','hours_variance','sched_payroll_est','actual_payroll','payroll_variance']}
          />
        </Card>
      </div>

      <Card title={'Roster Snapshot (Banyan)'}>
        <Table
          rows={(rosRes?.rows ?? []).slice(0,40)}
          columns={['first_name','last_name','email','phone','role']}
        />
      </Card>
    </div>
  );
}
