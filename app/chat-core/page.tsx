// app/chat-core/page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function ChatCore() {
  const [vault, setVault] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVault = async () => {
      try {
        const res = await fetch('/api/vault')
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Unknown error')
        } else {
          setVault(json)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchVault()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">TrainYourAI Chat</h1>
      {loading && <p>Loading vault...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {vault && (
        <pre className="bg-gray-100 p-4 rounded">
          {JSON.stringify(vault, null, 2)}
        </pre>
      )}
    </div>
  )
}