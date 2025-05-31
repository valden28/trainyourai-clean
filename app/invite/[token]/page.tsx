'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'

export default function InvitePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params?.token as string
  const linked_uid = searchParams.get('uid') || ''

  const [invite, setInvite] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/merv-links/validate?token=${token}`)
        const data = await res.json()

        if (data.error) {
          toast.error(data.error)
        } else {
          setInvite(data.invite)
        }
      } catch (err: any) {
        toast.error('Error validating invite.')
      } finally {
        setLoading(false)
      }
    }

    if (token) fetchInvite()
  }, [token])

  const handleAccept = async () => {
    try {
      const res = await fetch('/api/merv-links/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, linked_uid })
      })
      const data = await res.json()

      if (data.success) {
        toast.success('✅ Invite accepted. You are now connected.')
        setAccepted(true)
      } else {
        toast.error(data.error)
      }
    } catch (err: any) {
      toast.error('Error accepting invite.')
    }
  }

  const handleDecline = async () => {
    try {
      const res = await fetch('/api/merv-links/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Invite declined.')
        setInvite(null)
      } else {
        toast.error(data.error)
      }
    } catch (err: any) {
      toast.error('Error declining invite.')
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto text-white">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-4">Merv Invite</h1>

      {loading && <p>Loading invite...</p>}

      {!loading && !invite && (
        <p className="text-red-400">Invite not found or already used.</p>
      )}

      {!loading && invite && !accepted && (
        <div className="space-y-4 border p-4 rounded bg-white text-black">
          <p>
            <strong>{invite.user_uid}</strong> has invited you to connect.
          </p>
          <p>
            <strong>Type:</strong> {invite.link_type}
          </p>
          <p>
            <strong>Status:</strong> {invite.status}
          </p>

          {linked_uid ? (
            <div className="space-x-3">
              <button
                onClick={handleAccept}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                ✅ Accept Invite
              </button>
              <button
                onClick={handleDecline}
                className="bg-gray-600 text-white px-4 py-2 rounded"
              >
                ❌ Decline
              </button>
            </div>
          ) : (
            <p className="text-red-600 text-sm">
              ❗ You must be logged in or pass ?uid=auth0|... in the URL to accept.
            </p>
          )}
        </div>
      )}

      {accepted && (
        <div className="mt-4 text-green-400">
          You’re now connected. You can close this tab or return to your Merv dashboard.
        </div>
      )}
    </div>
  )
}