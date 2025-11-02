'use client';

export default function ChefDashboard() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-semibold">Chef Carlo · Kitchen Ops</h1>
      <p className="text-gray-600">
        Recipe yields, variance, purchasing trends, and cost insights will appear here.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-2">Top Variances (Food)</h2>
          <div className="text-gray-400 text-sm">TODO: connect v_variance</div>
        </section>
        <section className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-2">Purchasing / Price Movements</h2>
          <div className="text-gray-400 text-sm">TODO: connect v_price_trends</div>
        </section>
      </div>
    </div>
  );
}
