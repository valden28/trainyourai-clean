'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

export default function ChatChefPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // ✅ Prevent crash on bad user.sub
  if (!isLoading && (!user?.sub || typeof user.sub !== 'string')) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 text-center text-red-600 bg-white">
        <p className="text-lg font-semibold">
          ⚠️ Invalid user session. Please log out and log back in.
        </p>
      </main>
    )
  }

  const chatKey = user?.sub ? `trainyourai_chat_chef_${user.sub}` : null

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (chatKey) {
      const saved = localStorage.getItem(chatKey)
      if (saved) setMessages(JSON.parse(saved))
    }
  }, [chatKey])

  useEffect(() => {
    if (chatKey) {
      localStorage.setItem(chatKey, JSON.stringify(messages))
    }
  }, [messages, chatKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMessage = { role: 'user', content: input }

    const safeHistory = messages.map((msg) =>
      msg.role === 'assistant'
        ? { ...msg, name: 'chefCarlo' }
        : msg
    )

    const updatedMessages = [...safeHistory, newMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat-chef', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      const reply = await res.json()
      setMessages((prev) => [...prev, reply])
    } catch (err) {
      console.error('Chef chat error:', err)
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    if (chatKey) localStorage.removeItem(chatKey)
    setMessages([])
  }

  return (
    <main className="flex flex-col h-screen bg-white text-black border-l-8 border-green-600">
      <div className="flex justify-between items-center p-4 border-b bg-green-50 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-green-800">Chef Carlo</h1>
          <p className="text-xs text-gray-500">Culinary strategist — here to help you cook</p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => router.push('/chat-core')}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Talk to Merv
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-green-700 hover:underline"
          >
            Dashboard
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
            className={`p-3 rounded-xl max-w-2xl whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-blue-200 self-end' : 'bg-green-100 self-start'
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
          className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  )
}