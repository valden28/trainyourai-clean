'use client'

import { useState, useEffect, useRef } from 'react'

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return
    const userMessage = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]

    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      const data = await res.json()
      if (data?.content) {
        setMessages([...newMessages, { role: 'assistant', content: data.content }])
      } else {
        throw new Error('No reply from assistant')
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages([
        ...newMessages,
        { role: 'assistant', content: '⚠️ Error contacting Merv.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen px-4 py-6 bg-white text-black">
      <h1 className="text-2xl font-bold mb-4">🧠 Merv</h1>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 border-t pt-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-lg px-4 py-2 rounded shadow ${
              msg.role === 'user'
                ? 'bg-blue-100 self-end text-right'
                : 'bg-gray-100 self-start'
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-auto flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder="Ask your Merv something..."
          className="flex-1 p-2 border rounded resize-none"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}