'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';

export default function ChatCore() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading: userLoading } = useUser();
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

    if (user) fetchVault();
    else setLoading(false);
  }, [user]);

  const handleLogin = () => router.push('/api/auth/login');
  const handleDashboard = () => router.push('/dashboard');

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">TrainYourAI Chat</h1>

        {!user && !userLoading && (
          <button
            onClick={handleLogin}
            className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700"
          >
            Log In
          </button>
        )}

        {user && (
          <div className="flex gap-4">
            <button
              onClick={handleDashboard}
              className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700"
            >
              Dashboard
            </button>
            <button
              onClick={handleDashboard}
              className="bg-green-600 px-4 py-2 rounded text-white hover:bg-green-700"
            >
              Train Your AI
            </button>
          </div>
        )}
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {user && vault && (
        <div className="bg-white text-black p-4 rounded shadow mb-6">
          <p className="font-semibold mb-2">Welcome, your vault is active:</p>
          <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
            {JSON.stringify(vault, null, 2)}
          </pre>
        </div>
      )}

      <div className="bg-gray-900 p-4 rounded">
        <p className="text-blue-400 font-medium mb-2">
          {user ? 'This is your personal AI chat.' : 'This is a generic assistant. Log in to personalize.'}
        </p>
        {/* Replace this with actual chat UI when reconnected */}
        <div className="text-sm text-gray-300">Chat functionality here...</div>
      </div>
    </div>
  );
}