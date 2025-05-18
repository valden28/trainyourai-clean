'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface IdentityData {
  upbringing?: string;
  culture?: string;
  beliefs?: string;
  identity?: string;
  communicationStyle?: string;
  worldview?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: IdentityData;
}

const intro = ` Let’s go deeper into your background — the values, culture, and identity that shaped how you see the world.`;

export default function IdentitySection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<IdentityData>(existingData || {});
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    const rawText = intro;
    indexRef.current = 0;
    setTyping('');
    setShowDots(true);

    const delay = setTimeout(() => {
      setShowDots(false);
      const type = () => {
        if (indexRef.current < rawText.length) {
          const nextChar = rawText.charAt(indexRef.current);
          setTyping((prev) =>
            indexRef.current === 0 && nextChar === ' ' ? prev : prev + nextChar
          );
          indexRef.current++;
          setTimeout(type, 60);
        }
      };
      type();
    }, 900);

    return () => clearTimeout(delay);
  }, []);

  const handleChange = <K extends keyof IdentityData>(field: K, value: IdentityData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, innerview: form }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Identity & Background</h1>
      <p className="text-sm text-gray-600 mb-6">
        Your life story — where you came from, what you’ve experienced, and how you define yourself — is central to how your assistant understands and supports you. This context brings depth, not just data.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Upbringing or Early Environment</label>
        <input
          className="w-full border p-2 rounded"
          value={form.upbringing || ''}
          onChange={(e) => handleChange('upbringing', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Cultural Background</label>
        <input
          className="w-full border p-2 rounded"
          value={form.culture || ''}
          onChange={(e) => handleChange('culture', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Spiritual / Philosophical Beliefs</label>
        <input
          className="w-full border p-2 rounded"
          value={form.beliefs || ''}
          onChange={(e) => handleChange('beliefs', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Identity Markers</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. creative, neurodivergent, immigrant, etc."
          value={form.identity || ''}
          onChange={(e) => handleChange('identity', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">How You Communicate / Learn Best</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. visual learner, asks a lot of questions, prefers bullet points"
          value={form.communicationStyle || ''}
          onChange={(e) => handleChange('communicationStyle', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Your Worldview</label>
        <textarea
          rows={3}
          className="w-full border p-2 rounded"
          value={form.worldview || ''}
          onChange={(e) => handleChange('worldview', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          rows={3}
          className="w-full border p-2 rounded"
          value={form.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save and Complete InnerView'}
        </button>
      </div>
    </main>
  );
}