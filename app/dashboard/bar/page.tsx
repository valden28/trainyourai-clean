'use client';

export default function BarDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-semibold">Sam · Bar & Beverage</h1>
      <p className="text-gray-600">
        Pour cost %, bar inventory, cocktail costing, and variance will appear here.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-2">Pour Cost Summary</h2>
          <div className="text-gray-400 text-sm">TODO: connect bar PMIX + costs</div>
        </section>
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-2">Bar Price Changes / Contracts</h2>
          <div className="text-gray-400 text-sm">TODO: connect bar items in v_price_trends / violations</div>
        </section>
      </div>
    </div>
  );
}
