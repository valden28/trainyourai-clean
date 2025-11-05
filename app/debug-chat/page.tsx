'use client';

import { useState } from 'react';

export default function DebugChat() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState<string>('');
  const [raw, setRaw] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending…');
    setReply('');
    setRaw('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input || 'test ping' }),
      });

      const textBody = await res.text();   // never assume JSON; show raw
      setRaw(textBody);

      let data: any = {};
      try { data = JSON.parse(textBody); } catch {}

      const visible =
        (typeof data?.text === 'string' && data.text.trim()) ||
        (typeof data?.error === 'string' && `⚠️ ${data.error}`) ||
        `⚠️ Unexpected response: ${textBody}`;

      setReply(visible);
      setStatus(`HTTP ${res.status}`);
    } catch (err: any) {
      setStatus('network error');
      setReply(`❌ ${err?.message || 'unknown error'}`);
    }
  }

  return (
    <main className="min-h-screen p-6 space-y-4 bg-white text-black">
      <h1 className="text-2xl font-bold">/debug-chat</h1>
      <form onSubmit={send} className="flex gap-2">
        <input
          className="border rounded px-3 py-2 flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Ask: "Sales last month at Banyan House?"'
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Send</button>
      </form>

      <div className="text-sm text-gray-600">Status: {status || '—'}</div>

      <div className="p-4 rounded border bg-blue-50">
        <div className="font-semibold mb-1">Rendered reply</div>
        <pre className="whitespace-pre-wrap">{reply || '(empty)'}</pre>
      </div>

      <div className="p-4 rounded border bg-gray-50">
        <div className="font-semibold mb-1">Raw /api/chat response</div>
        <pre className="text-xs overflow-auto">{raw || '(no body)'}</pre>
      </div>
    </main>
  );
}
