'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';

export default function ChatCore() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    const fetchVault = async () => {
      try {
        const res = await fetch('/api/vault');
        const json = await res.json();
        setVault(json);
      } catch (err) {
        console.error('Vault fetch error:', err);
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
    <div className="min-h-screen bg-black text-white">
      {/* NAV BAR */}
      <div className="w-full bg-gray-900 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">TrainYourAI</h1>
        {!user && !userLoading && (
          <button
            onClick={handleLogin}
            className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700"
          >
            Log In
          </button>
        )}
        {user && (
          <div className="flex gap-2">
            <button
              onClick={handleDashboard}
              className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700"
            >
              Dashboard
            </button>
            <button
              onClick={handleDashboard}
              className="bg-green-600 px-4 py-1 rounded hover:bg-green-700"
            >
              Train Your AI
            </button>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="p-6">
        {loading && <p>Loading...</p>}

        {!user && !loading && (
          <div className="bg-gray-800 p-4 rounded mb-4">
            <p className="text-yellow-300 font-medium">
              You’re using a generic assistant. Log in to personalize.
            </p>
          </div>
        )}

        {user && vault && (
          <div className="bg-white text-black p-4 rounded shadow mb-6">
            <p className="font-semibold mb-2">Your vault is active:</p>
            <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
              {JSON.stringify(vault, null, 2)}
            </pre>
          </div>
        )}

        {/* Chat Interface Placeholder */}
        <div className="bg-gray-900 p-4 rounded text-sm">
          <p className="text-blue-400 font-medium mb-2">
            {user ? 'This is your personalized AI chat.' : 'This is a generic assistant.'}
          </p>
          <p className="text-gray-400">Chat functionality lives here...</p>
        </div>
      </div>
    </div>
  );
}