// app/tonesync/page.tsx — Type-safe and clean
'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import ToneSyncSection from '../onboarding/ToneSyncSection';

export default function ToneSyncPage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [existingData, setExistingData] = useState<any>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.sub) return;
      const { data } = await supabase
        .from('vaults_test')
        .select('tonesync')
        .eq('user_uid', user.sub)
        .single();
      setExistingData(data?.tonesync || null);
    };
    if (user?.sub) fetchData();
  }, [user]);

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700">Customize How I Speak</h1>
      <ToneSyncSection existingData={existingData || undefined} />
      <div className="mt-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-3 bg-gray-300 text-black rounded hover:bg-gray-400"
        >
          Back to Dashboard
        </button>
      </div>
    </main>
  );
}