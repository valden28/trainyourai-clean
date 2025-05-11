// /app/page.tsx

import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-4xl font-bold mb-4">TrainYourAI is Online</h1>
      <p className="text-lg mb-6">Welcome to your personalized AI assistant. Let’s get started.</p>
      <Link
        href="/chat-core"
        className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition"
      >
        Go to Chat
      </Link>
    </main>
  )
}