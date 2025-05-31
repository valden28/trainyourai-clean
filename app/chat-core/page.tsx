// File: /app/chat-core/page.tsx (with manual thread switch for Chef Carlo)

'use client'

import { useEffect, useRef, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import toast, { Toaster } from 'react-hot-toast'

export default function ChatCorePage() {
  const { user, isLoading } = useUser()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!user || !user.sub) return
    fetchMessages()
  }, [user])

  useEffect(() => {
    scrollToBottom()
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
          assistant: 'chef'
        })
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send')
      } else {
        setMessages((prev) => [...prev, { message: input, sender_uid: user?.sub, status: 'sent' }])
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
    <div className="min-h-screen p-6 bg-white text-black flex flex-col">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-4">Your Merv</h1>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-lg px-4 py-2 rounded shadow ${
              msg.sender_uid === user?.sub
                ? 'bg-green-100 text-right ml-auto'
                : 'bg-gray-100 text-left'
            }`}
          >
            <p>{msg.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {msg.category || 'general'} • {msg.status}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask your Merv something..."
          className="flex-1 px-3 py-2 border rounded text-black"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  )
}