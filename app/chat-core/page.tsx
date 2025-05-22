// File: /app/chat-core/page.tsx (updated to match backend message format)

'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

export default function ChatCorePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const chatKey = user ? `trainyourai_chat_${user.sub}` : null;

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (chatKey) {
      const saved = localStorage.getItem(chatKey);
      if (saved) setMessages(JSON.parse(saved));
    }
  }, [chatKey]);

  useEffect(() => {
    if (chatKey) {
      localStorage.setItem(chatKey, JSON.stringify(messages));
    }
  }, [messages, chatKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newMessage] }),
      });

      if (!res.ok) throw new Error('Failed to get assistant response');

      const reply = await res.json();

      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (chatKey) localStorage.removeItem(chatKey);
    setMessages([]);
  };

  return (
    <main className="flex flex-col h-screen bg-white text-black">
      <div className="flex justify-between items-center p-4 border-b bg-gray-50 shadow-sm">
        <h1 className="text-xl font-bold">Your AI Assistant</h1>
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-blue-600 hover:underline"
          >
            Go to Dashboard
          </button>
          <button
            onClick={clearChat}
            className="text-sm text-red-500 hover:underline"
          >
            Clear Chat
          </button>
          <a
            href="/api/auth/logout"
            className="text-sm text-gray-600 hover:underline"
          >
            Log Out
          </a>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl max-w-2xl ${
              m.role === 'user' ? 'bg-blue-200 self-end' : 'bg-gray-100 self-start'
            }`}
          >
            <strong>{m.role === 'user' ? 'You' : m.name || 'Assistant'}:</strong> {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex p-4 border-t bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow p-3 rounded-lg border border-gray-300 mr-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}