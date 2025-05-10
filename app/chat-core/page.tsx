// app/chat-core/page.tsx
import { getSession } from '@/lib/auth0'
import { supabase } from '@/lib/supabase'

export default async function ChatCore() {
  const session = await getSession()

  if (!session?.user) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h1>TrainYourAI Chat</h1>
        <p>Error: User not authenticated.</p>
      </div>
    )
  }

  const userUid = session.user.sub

  const { data: vault, error } = await supabase
    .from('vaults_test')
    .select('*')
    .eq('user_uid', userUid)
    .single()

  if (error || !vault) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h1>TrainYourAI Chat</h1>
        <p>Error: Vault not found or Supabase error.</p>
        <pre>{error?.message}</pre>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>TrainYourAI Chat</h1>
      <p>Welcome back, {vault.full_name || 'user'}!</p>
      <pre style={{ background: '#f1f1f1', padding: '1rem' }}>
        {JSON.stringify(vault, null, 2)}
      </pre>
    </div>
  )
}