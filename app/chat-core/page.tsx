'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import toast, { Toaster } from 'react-hot-toast'

type Msg = {
  message: string
  sender_uid: string | null
  status?: string
  category?: string
  assistant?: 'merv' | 'carlo' | 'luna'
}

export default function ChatCorePage() {
  const { user, isLoading } = useUser()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // ✅ Early exit if user.sub is invalid
  if (!isLoading && (!user?.sub || typeof user.sub !== 'string')) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 text-center text-red-600 bg-white">
        <p className="text-lg font-semibold">
          ⚠️ Your account is missing a valid ID. Please log out and log back in.
        </p>
      </main>
    )
  }

  useEffect(() => {
    if (user?.sub) fetchMessages()
  }, [user?.sub])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchMessages() {
    try {
      const uid = encodeURIComponent(user?.sub || '')
      const res = await fetch(`/api/merv-messages/fetch?uid=${uid}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load messages')
        return
      }
      setMessages((data.messages || []) as Msg[])
    } catch (err: any) {
      toast.error('❌ Error: ' + err.message)
    }
  }

  async function persistMessage(msg: Msg) {
    try {
      const res = await fetch('/api/merv-messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_uid: msg.sender_uid,
          receiver_uid: user?.sub,     // store conv under this user
          message: msg.message,
          category: msg.category || 'general',
          assistant: msg.assistant || 'merv',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        console.warn('persistMessage failed:', d)
      }
    } catch (e) {
      console.warn('persistMessage network error:', e)
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || !user?.sub) return

    // optimistic user bubble
    const userMsg: Msg = {
      message: text,
      sender_uid: user.sub,
      status: 'sent',
      category: 'general',
      assistant: 'merv',
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // persist user message (best-effort)
    persistMessage(userMsg)

    try {
      // 🔑 Call the data-aware chat route with the correct shape
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,       // << this is the key the route expects
          user_id: user.sub,   // passed through (optional)
        }),
      })

      const data = await res.json()

      // Build assistant message from /api/chat response
      const replyText: string =
        (typeof data?.text === 'string' && data.text) ||
        (typeof data?.error === 'string' && `⚠️ ${data.error}`) ||
        '⚠️ No response'

      const assistMsg: Msg = {
        message: replyText,
        sender_uid: null, // assistant
        status: 'sent',
        category: 'general',
        assistant: 'merv',
      }

      // show reply
      setMessages(prev => [...prev, assistMsg])

      // persist assistant reply (best-effort)
      persistMessage(assistMsg)
    } catch (err: any) {
      console.error(err)
      const failMsg: Msg = {
        message: '❌ Connection error. Please try again.',
        sender_uid: null,
        status: 'error',
        category: 'general',
        assistant: 'merv',
      }
      setMessages(prev => [...prev, failMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-white text-black">
      <Toaster position="top-right" />

      <div className="flex justify-between items-center p-4 border-b bg-blue-50 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-blue-800">Your Merv</h1>
          <p className="text-xs text-gray-500">
            General AI assistant — fast, versatile, personalized
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <a
            href="/chat-chef"
            className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Talk to Chef
          </a>
          <a href="/dashboard" className="text-sm text-blue-700 hover:underline">
            Dashboard
          </a>
          <a
            href="/api/auth/logout"
            className="text-sm text-gray-600 hover:underline"
          >
            Log Out
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-xl max-w-2xl whitespace-pre-wrap ${
              msg.sender_uid === user?.sub
                ? 'bg-green-100 self-end text-right ml-auto'
                : 'bg-gray-100 self-start'
            }`}
          >
            {msg.message}
            {msg.category || msg.status ? (
              <div className="text-xs text-gray-400 mt-1">
                {msg.category || 'general'}{msg.status ? ` • ${msg.status}` : ''}
              </div>
            ) : null}
          </div>
        ))}
        <div ref={bottomRef} />
        {loading && (
          <div className="text-center text-gray-400">Merv is thinking…</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!loading) sendMessage()
        }}
        className="flex p-4 border-t bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your Merv something…  e.g., “Sales last month at Banyan House?”"
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
