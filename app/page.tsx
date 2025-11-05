'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import Link from 'next/link'

export default function HomePage() {
  const { user, isLoading } = useUser()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-neutral-50 text-neutral-900 antialiased">
      <h1 className="text-5xl font-extrabold mb-6 tracking-tight text-neutral-900">
        Welcome to <span className="text-blue-700">TrainYourAI</span>
      </h1>

      <p className="text-lg text-neutral-800 max-w-xl mb-10 leading-relaxed">
        Your personalized AI — fully trained, totally secure, and completely yours.
      </p>

      {!isLoading && (
        <div className="space-x-6">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-block bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold shadow hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-colors"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/api/auth/login"
              className="inline-block bg-green-700 text-white px-8 py-3 rounded-lg font-semibold shadow hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 transition-colors"
            >
              Log in to Begin
            </Link>
          )}
        </div>
      )}

      <footer className="mt-16 text-sm text-neutral-600">
        Built for clarity · <span className="font-medium text-neutral-800">High-contrast mode enabled</span>
      </footer>
    </main>
  )
}
