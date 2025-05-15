'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white text-black p-6">
      <h1 className="text-4xl font-bold mb-4">TrainYourAI is Online</h1>
      <p className="text-lg text-gray-600 mb-8">
        Welcome to your personalized AI assistant. Let’s get started.
      </p>
      <div className="space-x-4">
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
          Go to Dashboard
        </a>
      </div>
    </main>
  );
}