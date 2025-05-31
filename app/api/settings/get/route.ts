'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@auth0/nextjs-auth0/client'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, isLoading } = useUser()
  const [autoShare, setAutoShare] = useState<{ recipes: boolean; calendar: boolean }>({
    recipes: false,
    calendar: false
  })
  const [accessList, setAccessList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.sub) {
      fetchSettings(user.sub)
    }
  }, [user])

  const fetchSettings = async (uid: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/settings/get?uid=${encodeURIComponent(uid)}`)
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setAutoShare(data.autoShare || { recipes: false, calendar: false })
      setAccessList(data.accessList || [])
    } catch (err) {
      toast.error('⚠️ Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveAutoShare = async () => {
    try {
      const res = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user?.sub,
          autoShare
        })
      })
      if (res.ok) {
        toast.success('✅ Auto-share settings saved')
      } else {
        toast.error('❌ Save failed')
      }
    } catch (err) {
      toast.error('❌ Network error while saving')
    }
  }

  return (
    <div className="min-h-screen p-6 bg-white text-black">
      <h1 className="text-2xl font-bold mb-6">Privacy & Sharing Settings</h1>

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <div className="bg-gray-100 p-4 rounded shadow max-w-xl mb-6">
            <h2 className="text-lg font-semibold mb-2">Auto-Share Categories</h2>
            <label className="block mb-2">
              <input
                type="checkbox"
                checked={autoShare.recipes}
                onChange={(e) =>
                  setAutoShare((prev) => ({ ...prev, recipes: e.target.checked }))
                }
                className="mr-2"
              />
              Share my recipes automatically with approved users
            </label>
            <label className="block">
              <input
                type="checkbox"
                checked={autoShare.calendar}
                onChange={(e) =>
                  setAutoShare((prev) => ({ ...prev, calendar: e.target.checked }))
                }
                className="mr-2"
              />
              Allow my calendar to be viewed or scheduled by trusted users
            </label>
            <button
              onClick={saveAutoShare}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Save Settings
            </button>
          </div>

          <div className="bg-gray-100 p-4 rounded shadow max-w-xl">
            <h2 className="text-lg font-semibold mb-2">People with Access</h2>
            {accessList.length === 0 && (
              <p className="text-sm text-gray-600">None yet.</p>
            )}
            {accessList.map((entry, i) => (
              <div key={i} className="text-sm mb-2">
                <strong>{entry.name || entry.allowed_uid}</strong> — access to:{' '}
                {entry.resource?.replace('recipes.', '') || 'unknown'}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}