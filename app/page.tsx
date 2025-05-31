'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import Link from 'next/link'

export default function HomePage() {
  const { user, isLoading } = useUser()

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-white text-black">
      <h1 className="text-4xl font-bold mb-4">Welcome to TrainYourAI</h1>
      <p className="text-gray-700 mb-8">
        This is your personalized AI. Fully trained, totally secure, always yours.
      </p>

      {!isLoading && (
        <div className="space-x-4">
          {user ? (
            <Link
              href="/dashboard"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/api/auth/login"
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Log in to Begin
            </Link>
          )}
        </div>
      )}
    </main>
  )
}