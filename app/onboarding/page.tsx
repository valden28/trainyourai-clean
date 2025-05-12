'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
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

  const handleComplete = async () => {
    try {
      const res = await fetch('/api/vault', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          innerview: {
            name: 'Dennis Valentino',
            role: 'Founder',
            location: 'Port Charlotte, FL',
          },
        }),
      });

      const updated = await res.json();
      setVault(updated);
      router.push('/dashboard');
    } catch (err) {
      console.error('Vault update failed:', err);
    }
  };

  return (
    <div className="p-6 bg-white text-black min-h-screen">
      <h1 className="text-3xl font-bold mb-6">InnerView Onboarding</h1>

      {loading && <p>Loading vault...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {vault && (
        <>
          <p className="mb-4">Let’s start by setting a few key profile details:</p>
          <div className="bg-gray-100 p-4 rounded shadow mb-4">
            <p><strong>Name:</strong> Dennis Valentino</p>
            <p><strong>Role:</strong> Founder</p>
            <p><strong>Location:</strong> Port Charlotte, FL</p>
          </div>
          <button
            onClick={handleComplete}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save & Continue
          </button>
        </>
      )}
    </div>
  );
}