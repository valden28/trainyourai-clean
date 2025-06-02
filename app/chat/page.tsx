'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

export default function ChatMervPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [invalidUser, setInvalidUser] = useState(false)

  const chatKey = user?.sub ? `trainyourai_chat_merv_${user.sub}` : null

  useEffect(() => {
    if (!isLoading && (!user?.sub || typeof user.sub !== 'string')) {
      setInvalidUser(true)
    } else if (!isLoading && !user) {
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

    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      const reply = await res.json()
      setMessages((prev) => [...prev, reply])
    } catch (err) {
      console.error('Merv chat error:', err)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Error contacting Merv.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    if (chatKey) localStorage.removeItem(chatKey)
    setMessages([])
  }

  if (invalidUser) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 text-center text-red-600 bg-white">
        <p className="text-lg font-semibold">
          ⚠️ Invalid user session. Please log out and log back in.
        </p>
      </main>
    )
  }

  return (
    <main className="flex flex-col h-screen bg-white text-black border-l-8 border-blue-600">
      <div className="flex justify-between items-center p-4 border-b bg-blue-50 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-blue-800">Your Merv</h1>
          <p className="text-xs text-gray-500">Personal strategist — grounded, sharp, calibrated</p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => router.push('/chat-chef')}
            className="px-3 py-1 rounded bg-orange-600 text-white hover:bg-orange-700"
          >
            Talk to Chef
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-blue-700 hover:underline"
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
  )
}