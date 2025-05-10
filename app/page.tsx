'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'

export default function ChatPage() {
  const [vault, setVault] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const uid = localStorage.getItem('user_uid')
    if (!uid) {
      setError('No UID found in localStorage.')
      return
    }

    const fetchVault = async () => {
      const { data, error } = await supabase
        .from('vaults_test')
        .select('*')
        .eq('user_uid', uid)
        .single()

      console.log('Query result:', { data, error })

      if (error) {
        setError(error.message)
      } else {
        setVault(data)
      }
    }

    fetchVault()
  }, [])

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>TrainYourAI Chat</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {vault ? (
        <pre>{JSON.stringify(vault, null, 2)}</pre>
      ) : (
        !error && <p>Loading vault data...</p>
      )}
    </main>
  )
}