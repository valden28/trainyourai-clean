'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import { useRouter } from 'next/navigation'
import { createUserVaultIfMissing } from '@/lib/vault/createUserVaultIfMissing'

export default function DashboardPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  const [vault, setVault] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ✅ Redirect if no valid user
  useEffect(() => {
    if (!isLoading && (!user || !user.sub || typeof user.sub !== 'string')) {
      router.push('/')
    }
  }, [user, isLoading, router])

  // ✅ Fetch vault + create if needed
  const fetchVault = async () => {
    try {
      const res = await fetch('/api/vault')
  
      if (!res.ok) {
        const text = await res.text()
        console.error('❌ Vault API error:', res.status, text)
        setError(`API Error ${res.status}: ${text}`)
        return
      }
  
      const json = await res.json()
  
      if (!json || typeof json !== 'object' || !('vault' in json)) {
        console.error('⚠️ Invalid vault response format:', json)
        setError('Invalid response from server.')
        return
      }
  
      setVault(json)
    } catch (err: any) {
      console.error('❌ Vault fetch crashed:', err)
      setError('Unexpected error loading vault.')
    } finally {
      setLoading(false)
    }
  }

    if (user?.sub && typeof user.sub === 'string') {
      createUserVaultIfMissing(user.sub)
      fetchVault()
    }
  }, [user])

  const missing = (field: string) => !vault?.[field]

  const handleStart = () => router.push('/onboarding')
  const handleTone = () => router.push('/tonesync')
  const handleChat = () => router.push('/chat')
  const handleSettings = () => router.push('/settings')

  const isComplete =
    vault &&
    vault.innerview &&
    vault.tonesync &&
    vault.skillsync

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <h1 className="text-3xl font-bold mb-6">Your Dashboard</h1>

      {loading && <p>Loading vault...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {vault && (
        <>
          <div
            className="mb-6 p-4 rounded shadow-md border-l-8 flex justify-between items-center"
            style={{
              borderColor: isComplete ? '#22c55e' : '#ef4444',
              backgroundColor: '#f9fafb'
            }}
          >
            <div>
              <p className="font-semibold text-lg">
                Vault Status: {isComplete ? 'Complete' : 'Incomplete'}
              </p>
              {!isComplete && (
                <p className="text-sm text-gray-600">
                  {[
                    missing('innerview') && 'InnerView',
                    missing('tonesync') && 'ToneSync',
                    missing('skillsync') && 'SkillSync',
                  ]
                    .filter(Boolean)
                    .join(', ')}{' '}
                  need setup.
                </p>
              )}
            </div>
            <div className="space-x-2">
              {missing('innerview') && (
                <button
                  onClick={handleStart}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Start InnerView
                </button>
              )}
              <button
                onClick={handleChat}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Go to Chat
              </button>
            </div>
          </div>

          <div className="mb-8 p-4 rounded shadow bg-white border border-gray-200 max-w-sm mx-auto">
            <p className="text-sm text-gray-600 text-center mb-2">Familiarity Index</p>
            <div className="relative w-24 h-24 mx-auto">
              <svg className="transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-300"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-blue-600 transition-all duration-500"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  strokeDasharray={`${vault?.familiarity_score || 0}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-blue-700">
                {vault?.familiarity_score || 0}%
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 text-center px-2">
              The more you train your AI, the more it becomes yours.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-gray-100 p-4 rounded shadow">
              <h2 className="font-semibold mb-2">InnerView</h2>
              <p className="text-sm text-gray-700">
                Tell me who you are — your story, values, and what you care about.
                This is where your assistant learns to think like someone who truly knows you.
              </p>
              <button
                onClick={handleStart}
                className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                {missing('innerview') ? 'Start' : 'Re-Interview'}
              </button>
            </div>

            <div className="bg-gray-100 p-4 rounded shadow">
              <h2 className="font-semibold mb-2">ToneSync</h2>
              <p className="text-sm text-gray-700">
                Choose how I speak — region, rhythm, language, and cultural flavor.
                I’ll adjust my tone to feel like someone you’d actually talk to.
              </p>
              <button
                onClick={handleTone}
                className="mt-2 bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
              >
                {missing('tonesync') ? 'Start' : 'Recalibrate'}
              </button>
            </div>

            <div className="bg-gray-100 p-4 rounded shadow">
              <h2 className="font-semibold mb-2">Vault Settings</h2>
              <p className="text-sm text-gray-700">
                Manage what’s inside your vault and see what’s connected.
                More controls and assistant tools coming soon.
              </p>
              <button
                onClick={handleSettings}
                className="mt-2 bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-800"
              >
                Open Vault Settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}