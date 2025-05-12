// app/chat-core/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function ChatCore() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="p-6 text-white bg-black min-h-screen">
      <h1 className="text-3xl font-bold mb-4">TrainYourAI Chat</h1>

      {loading && <p>Loading vault...</p>}

      {error && (
        <p className="text-red-500 font-medium">
          Error loading vault: {error}
        </p>
      )}

      {vault && (
        <div className="bg-white text-black p-4 rounded shadow-lg mt-4">
          <p className="font-semibold mb-2">Welcome, your vault is active:</p>
          <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
            {JSON.stringify(vault, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}