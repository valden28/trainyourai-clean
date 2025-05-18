'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface ToneSetting {
  label: string;
  scale: string;
  value: number;
}

interface ToneData {
  preferences: ToneSetting[];
  swearing?: string;
}

interface SectionProps {
  existingData?: ToneData;
}

const intro = `Let’s calibrate how I speak to you.
Some people prefer warmth, others want direct answers.
Some love a little wit — others prefer calm, clear, and focused.
This section tunes my tone to fit your style.`;

const defaultPreferences: ToneSetting[] = [
  { label: 'Formality', scale: 'Formal ←→ Casual', value: 3 },
  { label: 'Depth', scale: 'Surface-level ←→ Deep & thoughtful', value: 3 },
  { label: 'Warmth', scale: 'Cool / professional ←→ Friendly / empathetic', value: 3 },
  { label: 'Brevity', scale: 'Short & direct ←→ Longer & more detailed', value: 3 },
  { label: 'Playfulness', scale: 'Serious ←→ Playful / witty', value: 3 },
  { label: 'Encouragement', scale: 'Chill ←→ Motivating / hype me up', value: 3 },
  { label: 'Language Style', scale: 'Clean / professional ←→ Slang / relaxed', value: 3 }
];

const swearingOptions = [
  'No swearing',
  'Light swearing okay',
  'Full expressive language okay',
  'Depends on context'
];

export default function ToneSyncModule({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [preferences, setPreferences] = useState<ToneSetting[]>(
    existingData?.preferences || defaultPreferences
  );
  const [swearing, setSwearing] = useState<string>(existingData?.swearing || '');
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const current = preferences[step];

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

  const handleSlider = (value: number) => {
    setPreferences((prev) => {
      const updated = [...prev];
      updated[step].value = value;
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        tonesync: {
          preferences,
          swearing
        }
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Tone & Voice Preferences</h1>

      <div className="min-h-[100px] mb-6">
        {typing ? (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        ) : showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : null}
      </div>

      {step < preferences.length ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            {current.label}
          </label>
          <div className="text-sm text-gray-500 mb-1 italic">{current.scale}</div>
          <input
            type="range"
            min={1}
            max={5}
            value={current.value}
            onChange={(e) => handleSlider(parseInt(e.target.value))}
            className="w-full"
          />
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
          <label className="block text-sm font-medium text-gray-700">Comfort with swearing</label>
          <select
            className="w-full border p-2 rounded"
            value={swearing}
            onChange={(e) => setSwearing(e.target.value)}
          >
            <option value="">Select one</option>
            {swearingOptions.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Tone Preferences'}
          </button>
        </div>
      )}
    </main>
  );
}