'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [user, isLoading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center text-center p-6">
      <h1 className="text-3xl font-bold">Welcome to Onboarding</h1>
      <p className="mt-4 text-gray-600">This is the placeholder. Your accordion flow will load here.</p>
    </main>
  );
}