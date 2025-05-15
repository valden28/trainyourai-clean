// /app/page.tsx

'use client';

import { useUser } from '@auth0/nextjs-auth0/client';

export default function HomePage() {
  const { user, isLoading } = useUser();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-white text-black">
      <h1 className="text-4xl font-bold mb-4">TrainYourAI is Online</h1>
      <p className="text-lg text-gray-600 mb-8">
        Welcome to your personalized AI assistant. Let’s get started.
      </p>

      <div className="space-x-4">
        {!isLoading && !user && (
          <>
            <a
              href="/api/auth/login"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Log In
            </a>
            <a
             href="/dashboard"
            className="bg-gray-100 text-blue-600 px-6 py-2 rounded hover:bg-gray-200"
                >
                Get Started
                </a>
          </>
        )}

        {!isLoading && user && (
          <a
            href="/dashboard"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </a>
        )}
      </div>
    </main>
  );
}