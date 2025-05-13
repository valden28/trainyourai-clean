'use client';

import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatCorePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [...messages, userMessage] }),
      console.log('Sending to /api/chat', [...messages, userMessage]);
    });

    const assistantReply = await res.text();

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: assistantReply },
    ]);
    setLoading(false);
  };

  return (
    <main className="flex flex-col h-screen p-4 bg-gray-100 text-black">
      <div className="flex-grow overflow-y-auto space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl max-w-2xl ${
              m.role === 'user' ? 'bg-blue-200 self-end' : 'bg-white self-start'
            }`}
          >
            <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong> {m.content}
          </div>
        ))}
        {loading && <p className="italic">Assistant is replying...</p>}
      </div>

      <form onSubmit={handleSend} className="flex border-t mt-4 bg-white p-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow p-2 rounded border border-gray-300 mr-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}