'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface PopCulture {
  music?: string;
  movies?: string;
  shows?: string;
  books?: string;
  influencers?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: PopCulture;
}

const intro = ` Let’s talk about your taste in music, movies, shows, and books. These preferences can shape how you express yourself, what makes you feel something, and how you unwind.`;

export default function PopCultureSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<PopCulture>(existingData || {});
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

  const handleChange = <K extends keyof PopCulture>(field: K, value: PopCulture[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, popculture: form }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Pop Culture & Personal Taste</h1>
      <p className="text-sm text-gray-600 mb-6">
        Your cultural preferences — music, film, books, shows — offer insight into your emotional range, identity, and comfort zone. These details help your assistant communicate in ways that feel personal and relevant.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Favorite Music or Artists</label>
        <input
          className="w-full border p-2 rounded"
          value={form.music || ''}
          onChange={(e) => handleChange('music', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Favorite Movies or Genres</label>
        <input
          className="w-full border p-2 rounded"
          value={form.movies || ''}
          onChange={(e) => handleChange('movies', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">TV Shows You Love or Follow</label>
        <input
          className="w-full border p-2 rounded"
          value={form.shows || ''}
          onChange={(e) => handleChange('shows', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Books or Authors That Resonate</label>
        <input
          className="w-full border p-2 rounded"
          value={form.books || ''}
          onChange={(e) => handleChange('books', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Influencers, Creators, or Podcasts</label>
        <input
          className="w-full border p-2 rounded"
          value={form.influencers || ''}
          onChange={(e) => handleChange('influencers', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          rows={3}
          className="w-full border p-2 rounded"
          placeholder="Anything else about your taste or identity worth noting..."
          value={form.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save and Continue'}
        </button>
      </div>
    </main>
  );
}