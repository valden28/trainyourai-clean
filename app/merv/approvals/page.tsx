'use client'

import { useEffect, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'

export default function ApprovalInbox() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const owner_uid = 'auth0|680d2b50b77c3e848ec81f29' // Dave (change to dynamic later)

  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const res = await fetch(`/api/merv-approvals?uid=${owner_uid}`)
        const data = await res.json()
        if (data.approvals) setApprovals(data.approvals)
      } catch (err) {
        toast.error('Failed to load approvals')
      } finally {
        setLoading(false)
      }
    }

    fetchApprovals()
  }, [])

  const respond = async (id: string, action: 'approve' | 'deny') => {
    try {
      const res = await fetch('/api/merv-approvals/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`✅ ${action === 'approve' ? 'Approved' : 'Denied'}`)
        setApprovals((prev) => prev.filter((a) => a.id !== id))
      } else {
        toast.error(data.error)
      }
    } catch (err) {
      toast.error('Error responding to request')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto text-white">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-4">Pending Approvals</h1>

      {loading && <p>Loading...</p>}

      {!loading && approvals.length === 0 && (
        <p className="text-gray-400">No pending approval requests.</p>
      )}

      {approvals.map((req) => (
        <div key={req.id} className="border bg-white text-black p-4 rounded mb-4 shadow space-y-2">
          <div><strong>Requester:</strong> {req.requester_uid}</div>
          <div><strong>Assistant:</strong> {req.assistant}</div>
          <div><strong>Resource:</strong> {req.resource}</div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => respond(req.id, 'approve')}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              ✅ Approve
            </button>
            <button
              onClick={() => respond(req.id, 'deny')}
              className="bg-red-600 text-white px-3 py-1 rounded"
            >
              ❌ Deny
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}