'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface PopCultureData {
  favorites?: string;
  music?: string[];
  artists?: string;
  media?: string;
  genres?: string[];
  influencers?: string;
  narrative?: string;
}

interface SectionProps {
  existingData?: PopCultureData;
}

const intro = `Let’s make space for fun — the shows you binge, the music you blast, the books or podcasts you return to.
This helps me understand your taste, make better recs, and reference things that feel familiar or meaningful to you.`;

const genreTags = [
  'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Romance', 'Mystery',
  'Action', 'True Crime', 'Documentary', 'Reality', 'Coming-of-age', 'Fantasy', 'Biographical', 'Other'
];

const musicGenres = [
  'Pop', 'Hip-Hop / Rap', 'Rock', 'R&B / Soul', 'Country',
  'Jazz', 'Classical', 'Electronic / EDM', 'Alternative', 'Indie', 'Worship / Spiritual', 'Other'
];

export default function PopCultureSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<PopCultureData>(existingData || {});
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const questions = [
    { key: 'favorites', label: 'What are some of your all-time favorite shows, movies, or series?' },
    { key: 'music', label: 'What kind of music do you enjoy?', type: 'multi', options: musicGenres },
    { key: 'artists', label: 'Any specific artists or bands you love?' },
    { key: 'media', label: 'Do you read or listen to anything regularly? (Books, podcasts, newsletters, etc.)' },
    { key: 'genres', label: 'What genres or themes usually draw you in?', type: 'multi', options: genreTags },
    { key: 'influencers', label: 'Any creators, celebrities, or personalities you follow or admire?' }
  ];

  const current = questions[step];

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

  const handleMultiSelect = (key: keyof PopCultureData, option: string) => {
    setForm((prev) => {
      const currentVal = prev[key] as string[] | undefined;
      const next = currentVal?.includes(option)
        ? currentVal.filter((o) => o !== option)
        : [...(currentVal || []), option];
      return { ...prev, [key]: next };
    });
  };

  const handleChange = <K extends keyof PopCultureData>(key: K, value: PopCultureData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        popculture: form
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Pop Culture & Personal Taste</h1>

      <div className="min-h-[100px] mb-6">
        {typing ? (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        ) : showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : null}
      </div>

      {step < questions.length ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">{current.label}</label>
          {'options' in current && current.type === 'multi' ? (
            <div className="flex flex-wrap gap-2">
              {current.options!.map((option) => (
                <button
                  key={option}
                  onClick={() => handleMultiSelect(current.key as keyof PopCultureData, option)}
                  className={`px-3 py-1 rounded border ${
                    (form[current.key as keyof PopCultureData] as string[])?.includes(option)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-black border-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              rows={3}
              className="w-full border p-2 rounded"
              value={form[current.key as keyof PopCultureData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof PopCultureData, e.target.value)
              }
            />
          )}
          <div className="flex justify-between mt-4">
            <button
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              className="px-4 py-2 bg-gray-300 text-black rounded disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Any final thoughts on your taste, style, or what shaped you culturally?
          </label>
          <textarea
            rows={4}
            className="w-full border p-2 rounded"
            value={form.narrative || ''}
            onChange={(e) => handleChange('narrative', e.target.value)}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>
      )}
    </main>
  );
}