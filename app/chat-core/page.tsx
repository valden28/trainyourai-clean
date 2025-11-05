'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import toast, { Toaster } from 'react-hot-toast'

export default function ChatCorePage() {
  const { user, isLoading } = useUser()
  const [messages, setMessages] = useState<any[]>([])
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
    if (user?.sub) {
      fetchMessages()
    }
  }, [user?.sub])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load existing message history
  const fetchMessages = async () => {
    try {
      const uid = encodeURIComponent(user?.sub || '')
      const res = await fetch(`/api/merv-messages/fetch?uid=${uid}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to load messages')
        return
      }
      setMessages(data.messages || [])
    } catch (err: any) {
      toast.error('❌ Error: ' + err.message)
    }
  }

  // Save a message to your Supabase log
  const persistMessage = async (msg: any) => {
    try {
      await fetch('/api/merv-messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_uid: msg.sender_uid,
          receiver_uid: user?.sub,
          message: msg.message,
          category: msg.category || 'general',
          assistant: msg.assistant || 'merv',
        }),
      })
    } catch (err) {
      console.warn('persistMessage error', err)
    }
  }

  // Send message to Merv
  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setLoading(true)

    // Add user bubble immediately
    const userMsg = { message: text, sender_uid: user?.sub, status: 'sent' }
    setMessages(prev => [...prev, userMsg])
    persistMessage(userMsg)

    try {
      // 🔹 Call Merv’s data-aware chat route
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user_id: user?.sub,
        }),
      })

      const data = await res.json()

      // Handle Merv's response
      const replyText =
        typeof data?.text === 'string'
          ? data.text
          : data?.error
          ? `⚠️ ${data.error}`
          : '⚠️ No response from Merv.'

      const mervMsg = { message: replyText, sender_uid: null, status: 'sent' }
      setMessages(prev => [...prev, mervMsg])
      persistMessage(mervMsg)
    } catch (err: any) {
      console.error(err)
      const failMsg = {
        message: '❌ Connection error. Please try again.',
        sender_uid: null,
      }
      setMessages(prev => [...prev, failMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-white text-black">
      <Toaster position="top-right" />

      <header className="flex justify-between items-center p-4 border-b bg-blue-50 shadow-sm">
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
      </header>

      <section className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 mt-10">
            Ask Merv about sales, managers, or reports...
          </p>
        )}
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
          </div>
        ))}
        {loading && (
          <div className="text-center text-gray-400 animate-pulse">
            Merv is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      <form
        onSubmit={e => {
          e.preventDefault()
          if (!loading) sendMessage()
        }}
        className="flex p-4 border-t bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='Ask Merv something… e.g. "Sales last month at Banyan House?"'
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
