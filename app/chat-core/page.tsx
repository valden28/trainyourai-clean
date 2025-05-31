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
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const sendMessage = async () => {
    if (!input.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/merv-messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_uid: user?.sub,
          receiver_uid: user?.sub,
          message: input.trim(),
          category: 'general',
          assistant: 'merv'
        })
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send')
      } else {
        setMessages((prev) => [
          ...prev,
          { message: input, sender_uid: user?.sub, status: 'sent' }
        ])
        setInput('')
        fetchMessages()
      }
    } catch (err: any) {
      toast.error('❌ Error: ' + err.message)
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
          <a
            href="/dashboard"
            className="text-sm text-blue-700 hover:underline"
          >
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
            <div className="text-xs text-gray-400 mt-1">
              {msg.category} • {msg.status}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage()
        }}
        className="flex p-4 border-t bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your Merv something..."
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