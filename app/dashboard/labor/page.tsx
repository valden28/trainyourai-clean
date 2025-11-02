'use client';

export default function LaborDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-semibold">Luna · Labor & People Ops</h1>
      <p className="text-gray-600">
        Labor %, overtime hotspots, and staffing summaries will appear here.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-2">Labor % by Month</h2>
          <div className="text-gray-400 text-sm">TODO: connect v_labor_summary + v_owner_kpis</div>
        </section>
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-2">Overtime / Coverage Alerts</h2>
          <div className="text-gray-400 text-sm">TODO: connect timesheets + rules</div>
        </section>
      </div>
    </div>
  );
}
