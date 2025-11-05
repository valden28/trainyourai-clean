'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

export default function ChatCorePage() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const [invalidUser, setInvalidUser] = useState(false)
  const chatKey = user?.sub ? `trainyourai_chat_core_${user.sub}` : null

  // Validate session / redirect
  useEffect(() => {
    if (!isLoading && (!user?.sub || typeof user.sub !== 'string')) {
      setInvalidUser(true)
    } else if (!isLoading && !user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  // Load history from localStorage
  useEffect(() => {
    if (chatKey) {
      const saved = localStorage.getItem(chatKey)
      if (saved) setMessages(JSON.parse(saved))
    }
  }, [chatKey])

  // Persist history to localStorage
  useEffect(() => {
    if (chatKey) {
      localStorage.setItem(chatKey, JSON.stringify(messages))
    }
  }, [messages, chatKey])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send to /api/chat (data-aware Merv)
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userText = input.trim()
    const newUserMsg: ChatMsg = { role: 'user', content: userText }
    setMessages(prev => [...prev, newUserMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,        // ✅ key that /api/chat expects
          user_id: user?.sub || null
        })
      })

      // If server returns HTML error page, avoid JSON parse crash
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        const errMsg = `⚠️ API ${res.status}${text ? `: ${text}` : ''}`
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
        setLoading(false)
        return
      }

      const data = await res.json().catch(() => ({} as any))
      // Robust extraction of reply text
      const reply: string =
        (typeof data?.text === 'string' && data.text.trim().length > 0)
          ? data.text
          : (typeof data?.error === 'string' && data.error.trim().length > 0)
          ? `⚠️ ${data.error}`
          : `⚠️ Unexpected response:\n${JSON.stringify(data ?? {}, null, 2)}`

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ Connection error: ${err?.message || 'unknown error'}` }
      ])
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-xl font-bold text-blue-800">Merv</h1>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => router.push('/chat-chef')}
            className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Talk to Chef
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-blue-700 hover:underline"
          >
            Dashboard
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
              m.role === 'user' ? 'bg-blue-200 self-end' : 'bg-blue-100 self-start'
            }`}
          >
            <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong>{' '}
            {m.content && m.content.trim().length > 0 ? m.content : <span className="text-gray-400 italic">(empty)</span>}
          </div>
        ))}
        {loading && (
          <div className="text-center text-gray-400">Merv is thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex p-4 border-t bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Merv about sales, managers, or reports…"
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
