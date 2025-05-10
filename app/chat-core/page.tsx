'use client'

import { useEffect, useState } from 'react'

export default function ChatCore() {
  const [vault, setVault] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/vault')
      .then((res) => res.json())
      .then((data) => {
        if (data.vault) {
          setVault(data.vault)
        } else {
          setError(data.error || 'Unknown error')
        }
      })
      .catch((err) => {
        setError('Fetch failed: ' + err.message)
      })
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
        Chat Core Route is ALIVE (With Supabase)
      </h1>
      <p>This is pulling data from your Supabase `vaults_test` table.</p>

      {vault && (
        <pre style={{ background: '#f0f0f0', padding: '1rem', marginTop: '1rem' }}>
          {JSON.stringify(vault, null, 2)}
        </pre>
      )}

      {error && (
        <p style={{ color: 'red', marginTop: '1rem' }}>
          Error: {error}
        </p>
      )}
    </div>
  )
}