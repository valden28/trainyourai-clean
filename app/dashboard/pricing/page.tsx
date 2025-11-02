'use client';

export default function PricingDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-semibold">Pricing · Vendor Alerts</h1>
      <p className="text-gray-600">
        Contract breaches and recent vendor price changes will appear here.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-2">Contract Violations</h2>
          <div className="text-gray-400 text-sm">TODO: connect v_price_contract_violations</div>
        </section>
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-2">Recent Price Movers</h2>
          <div className="text-gray-400 text-sm">TODO: connect v_price_anomalies / v_price_trends</div>
        </section>
      </div>
    </div>
  );
}
