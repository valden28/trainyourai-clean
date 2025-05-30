'use client'

import { useRef, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

const USERS = {
  den: {
    name: 'Den',
    uid: 'auth0|6825cc5ba058089b86c4edc0'
  },
  dave: {
    name: 'Dave',
    uid: 'auth0|680d2b50b77c3e848ec81f29'
  }
}

export default function TestMessagingPage() {
  const [currentUser, setCurrentUser] = useState<'den' | 'dave'>('den')
  const user = USERS[currentUser]
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleNaturalInput = async (input: string) => {
    try {
      await fetch('/api/merv-messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_uid: USERS.den.uid,
          receiver_uid: USERS.dave.uid,
          message: input,
          category: 'general',
          assistant: 'chef'
        })
      })

      toast.success(`🧠 Sent to Chef: "${input}"`)
    } catch (err: any) {
      toast.error('❌ Error: ' + err.message)
    }
  }

  const handleFetchMessages = async () => {
    if (!user?.uid) {
      toast.error('❌ No UID selected. Please pick a user.')
      return
    }

    setLoading(true)
    try {
      const encodedUid = encodeURIComponent(user.uid)
      console.log('📬 Fetching inbox for UID:', user.uid)

      const res = await fetch(`/api/merv-messages/fetch?uid=${encodedUid}`)

      if (!res.ok) {
        const raw = await res.text()
        console.error('❌ Non-200 response:', res.status)
        console.error('💬 Raw response text:', raw)
        toast.error(`❌ Server error: ${res.status}`)
        return
      }

      const data = await res.json()
      const results = data.messages || data.handled || []

      setMessages(results)

      const unread = results.filter((msg: any) => {
        const m = msg.message || msg
        return m.status === 'unread'
      })

      if (unread.length > 0) {
        toast.success(`🔔 ${unread.length} new message${unread.length > 1 ? 's' : ''}`)
      }
    } catch (err: any) {
      console.error('❌ Fetch error:', err)
      toast.error('❌ Error fetching messages: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto text-white">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold">Merv Messaging Test</h1>

      <div className="flex items-center gap-3">
        <span className="text-sm">Viewing inbox as:</span>
        <select
          value={currentUser}
          onChange={(e) => setCurrentUser(e.target.value as 'den' | 'dave')}
          className="text-black px-2 py-1 rounded"
        >
          <option value="den">Den</option>
          <option value="dave">Dave</option>
        </select>
        <button
          onClick={handleFetchMessages}
          className="bg-black px-4 py-2 rounded text-white"
        >
          Fetch Messages for {user.name}
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => handleNaturalInput('Save this as Cowboy Beans')}
          className="bg-green-700 px-4 py-2 rounded"
        >
          Save Cowboy Beans
        </button>

        <button
          onClick={() => handleNaturalInput('What recipes do I have saved?')}
          className="bg-blue-700 px-4 py-2 rounded"
        >
          List My Recipes
        </button>

        <button
          onClick={() => handleNaturalInput('Send Dave my Cowboy Beans recipe')}
          className="bg-pink-600 px-4 py-2 rounded"
        >
          Share Cowboy Beans
        </button>
      </div>

      <div className="pt-6 space-y-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Try: Save this as Chili Mac"
          className="w-full border border-gray-500 px-3 py-2 rounded bg-black text-white placeholder-gray-400"
          onKeyDown={async (e) => {
            if (e.key === 'Enter') {
              const input = inputRef.current?.value?.trim()
              if (!input) return
              await handleNaturalInput(input)
              if (inputRef.current) inputRef.current.value = ''
            }
          }}
        />
        <p className="text-sm text-gray-400">Press <kbd>Enter</kbd> to send natural prompt</p>
      </div>

      {messages.length > 0 && (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold">Fetched Messages:</h2>
          {messages.map((msg, i) => {
            const m = msg.message || msg
            return (
              <div key={i} className="bg-white text-black p-4 rounded shadow space-y-2">
                <div><strong>From:</strong> {m.sender_uid}</div>
                <div><strong>Message:</strong> {m.message}</div>
                <div><strong>Status:</strong> {m.status}</div>
                <div><strong>Category:</strong> {m.category}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}