'use client';

import Link from 'next/link';
import React from 'react';

export default function DashboardHome() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-semibold">Dashboard Overview</h1>

      <p className="text-gray-600">
        Choose a section below to view detailed reports and KPIs.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/dashboard/owner"
          className="block rounded-lg border p-6 bg-white shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">Owner / KPIs</h2>
          <p className="text-gray-500 text-sm">
            Monthly revenue, labor %, food/bar costs, and prime cost summary.
          </p>
        </Link>

        <Link
          href="/dashboard/chef"
          className="block rounded-lg border p-6 bg-white shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">Chef Carlo (Kitchen Ops)</h2>
          <p className="text-gray-500 text-sm">
            Recipe yields, variance, purchasing trends, and cost insights.
          </p>
        </Link>

        <Link
          href="/dashboard/bar"
          className="block rounded-lg border p-6 bg-white shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">Sam (Bar / Beverage)</h2>
          <p className="text-gray-500 text-sm">
            Pour cost analysis, beverage inventory, and cocktail costing.
          </p>
        </Link>

        <Link
          href="/dashboard/labor"
          className="block rounded-lg border p-6 bg-white shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">Luna (Labor & Scheduling)</h2>
          <p className="text-gray-500 text-sm">
            Labor cost %, overtime alerts, and staffing summaries.
          </p>
        </Link>

        <Link
          href="/dashboard/pricing"
          className="block rounded-lg border p-6 bg-white shadow-sm hover:shadow-md transition"
        >
          <h2 className="text-xl font-semibold mb-2">Price / Vendor Alerts</h2>
          <p className="text-gray-500 text-sm">
            Contract breaches and real-time vendor pricing changes.
          </p>
        </Link>
      </div>
    </div>
  );
}
