import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>TrainYourAI is Online (Live)</h1> {/* <-- changed this line */}
      <p style={{ marginTop: '1rem' }}>
        Ready to get started?
      </p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/chat-core" style={{
          padding: '0.5rem 1rem',
          background: '#000',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '4px'
        }}>
          Go to Chat
        </Link>
      </div>
    </main>
  )
}