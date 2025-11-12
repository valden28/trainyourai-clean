'use client';

import Link from 'next/link';

export default function DashboardHome() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-semibold">Dashboard Overview</h1>
      <p className="text-gray-600">Choose a section to view detailed reports and KPIs.</p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card href="/dashboard/owner"      title="Owner / KPIs"        copy="Monthly revenue, costs, and prime cost summary." />
  <Card href="/dashboard/owner/live" title="Owner · Live KPIs"   copy="WTD / This Week by Store · Group · Company." />
  <Card href="/dashboard/chef"       title="Chef Carlo"          copy="Recipe yields, variance, purchasing trends." />
  <Card href="/dashboard/bar"        title="Sam · Bar"           copy="Pour cost, bar inventory, cocktail costing." />
  <Card href="/dashboard/labor"      title="Luna · Labor"        copy="Labor %, overtime alerts, staffing." />
  <Card href="/dashboard/pricing"    title="Pricing / Alerts"    copy="Contract breaches & vendor price changes." />
</div>
  );
}

function Card({ href, title, copy }: { href: string; title: string; copy: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border p-6 bg-white shadow-sm hover:shadow-md transition"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-500 text-sm">{copy}</p>
    </Link>
  );
}
