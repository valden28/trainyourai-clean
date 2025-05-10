import Link from 'next/link'

export default function Home() {
  return (
    <main className="p-8 font-sans">
      <h1 className="text-3xl font-bold">Welcome to TrainYourAI</h1>
      <p className="mt-4">You’re on the homepage. Ready to train or chat?</p>
      <div className="mt-6">
        <Link
          href="/chat-core"
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Go to Chat
        </Link>
      </div>
    </main>
  )
}