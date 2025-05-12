'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';

export default function ChatCore() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          vault,
        }),
      });

      const data = await res.json();
      const reply = { role: 'assistant', content: data.reply };
      setMessages([...newMessages, reply]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        role: 'assistant',
        content: 'Sorry, something went wrong.',
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleLogin = () => router.push('/api/auth/login');
  const handleDashboard = () => router.push('/dashboard');

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Top Nav */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">TrainYourAI</h1>
        {!user && !userLoading && (
          <button onClick={handleLogin} className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700">
            Log In
          </button>
        )}
        {user && (
          <div className="flex gap-2">
            <button onClick={handleDashboard} className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700">
              Dashboard
            </button>
            <button onClick={handleDashboard} className="bg-green-600 px-3 py-1 rounded hover:bg-green-700">
              Train Your AI
            </button>
          </div>
        )}
      </div>

      {/* Vault Debug Display */}
      {user && vault && (
        <div className="bg-white text-black p-4 rounded shadow mb-4 text-sm">
          <p className="font-semibold mb-2">Your vault is active:</p>
          <pre className="whitespace-pre-wrap">{JSON.stringify(vault, null, 2)}</pre>
        </div>
      )}

      {/* Chat */}
      <div className="bg-gray-900 p-4 rounded max-h-[400px] overflow-y-auto mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`mb-3 p-3 rounded ${
              msg.role === 'user' ? 'bg-blue-600 text-white text-right' : 'bg-gray-700 text-white text-left'
            }`}
          >
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ))}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-grow p-2 rounded text-black"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700" disabled={sending}>
            Send
          </button>
        </form>
      )}

      {!user && !userLoading && (
        <p className="mt-4 text-yellow-400 text-sm">Log in to use personalized chat.</p>
      )}
    </div>
  );
}