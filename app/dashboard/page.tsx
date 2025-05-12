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
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVault();
  }, []);

  const missing = (field: string) => !vault?.[field];

  const handleStart = () => router.push('/onboarding');
  const handleTone = () => router.push('/onboarding/tone');

  const isComplete =
    vault &&
    vault.innerview &&
    vault.tonesync &&
    vault.skillsync &&
    vault.persona_mode;

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <h1 className="text-3xl font-bold mb-6">Your Dashboard</h1>

      {loading && <p>Loading vault...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {vault && (
        <>
          <div className="mb-6 p-4 rounded shadow-md border-l-8 flex justify-between items-center"
               style={{ borderColor: isComplete ? '#22c55e' : '#ef4444', backgroundColor: '#f9fafb' }}>
            <div>
              <p className="font-semibold text-lg">
                Vault Status: {isComplete ? 'Complete' : 'Incomplete'}
              </p>
              {!isComplete && (
                <p className="text-sm text-gray-600">
                  {[
                    missing('innerview') && 'InnerView',
                    missing('tonesync') && 'ToneSync',
                    missing('skillsync') && 'SkillSync',
                    missing('persona_mode') && 'PersonaMode',
                  ]
                    .filter(Boolean)
                    .join(', ')}{' '}
                  need setup.
                </p>
              )}
            </div>
            {missing('innerview') && (
              <button
                onClick={handleStart}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Start InnerView
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-gray-100 p-4 rounded shadow">
              <h2 className="font-semibold mb-2">InnerView</h2>
              <p className="text-sm text-gray-700">
                Your core identity and values. Essential for personalized AI.
              </p>
              <button
                onClick={handleStart}
                className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                {missing('innerview') ? 'Start' : 'Edit'}
              </button>
            </div>

            <div className="bg-gray-100 p-4 rounded shadow">
              <h2 className="font-semibold mb-2">ToneSync</h2>
              <p className="text-sm text-gray-700">
                Calibrate your assistant’s voice and style.
              </p>
              <button
                onClick={handleTone}
                className="mt-2 bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
              >
                {missing('tonesync') ? 'Start' : 'Edit'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}