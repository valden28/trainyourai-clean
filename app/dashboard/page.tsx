'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchVault = async () => {
      try {
        const res = await fetch('/api/vault');
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || 'Unknown error');
        } else {
          setVault(json);

          // If innerview is missing, redirect to onboarding
          if (!json.innerview) {
            router.push('/onboarding'); // Update this route if needed
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVault();
  }, [router]);

  return (
    <div className="p-6 bg-white text-black min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      {loading && <p>Loading vault data...</p>}
      {error && (
        <p className="text-red-600 font-medium">Error: {error}</p>
      )}

      {vault && (
        <>
          <div className="bg-gray-100 p-4 rounded shadow mb-6">
            <p className="font-semibold text-green-600 flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2" />
              Vault Active
            </p>
            <pre className="mt-2 text-sm whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(vault, null, 2)}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-100 p-4 rounded shadow">
              <h2 className="font-bold mb-2">Expert Packs</h2>
              <p className="text-sm text-gray-700">Coming soon…</p>
            </div>

            <div className="bg-purple-100 p-4 rounded shadow">
              <h2 className="font-bold mb-2">Personality Filters</h2>
              <p className="text-sm text-gray-700">Coming soon…</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}