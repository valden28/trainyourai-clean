'use client';

import { useEffect, useState } from 'react';

export default function ChatCore() {
  const [vault, setVault] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
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
      const assistantMessage = { role: 'assistant', content: data.reply };
      setMessages([...newMessages, assistantMessage]);
    } catch (err: any) {
      const errorMsg = {
        role: 'assistant',
        content: `Error: ${err.message || 'Something went wrong'}`,
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setSending(false);
    }
  };

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
        <>
          <div className="bg-white text-black p-4 rounded shadow-lg mb-6">
            <p className="font-semibold mb-2">Welcome, your vault is active:</p>
            <pre className="whitespace-pre-wrap text-sm overflow-x-auto">
              {JSON.stringify(vault, null, 2)}
            </pre>
          </div>

          {/* Chat Messages */}
          <div className="bg-gray-900 p-4 rounded-lg max-h-[400px] overflow-y-auto mb-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-3 p-3 rounded ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white text-right'
                    : 'bg-gray-700 text-white text-left'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-grow p-3 rounded bg-white text-black"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-blue-500 px-4 py-2 rounded text-white font-semibold hover:bg-blue-600"
            >
              {sending ? '...' : 'Send'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}