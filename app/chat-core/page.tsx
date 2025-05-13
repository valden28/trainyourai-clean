'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef } from 'react';

export default function ChatCorePage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat'
  });

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="flex flex-col h-screen bg-gray-100 text-black">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-xl max-w-2xl ${
              m.role === 'user' ? 'bg-blue-200 self-end' : 'bg-white self-start'
            }`}
          >
            <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong> {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex p-4 border-t bg-white"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="flex-grow p-3 rounded-lg border border-gray-300 mr-2"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}