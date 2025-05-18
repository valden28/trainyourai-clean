'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface RegionalSliders {
  language: number;
  culture: number;
  food: number;
  socialTone: number;
}

interface ToneSyncData {
  preferences: {
    label: string;
    scale: string;
    value: number;
  }[];
  swearing?: string;
  regionalFeel?: {
    region?: string;
    autoDetect?: boolean;
    sliders: RegionalSliders;
  };
}

const intro = `Let’s calibrate how I speak to you.
Some people prefer warmth, others want direct answers.
This helps me reflect your personality, tone, and — if you want — a regional flavor.`;

const defaultPreferences = [
  { label: 'Formality', scale: 'Formal ←→ Casual', value: 3 },
  { label: 'Depth', scale: 'Surface-level ←→ Deep & thoughtful', value: 3 },
  { label: 'Warmth', scale: 'Cool ←→ Friendly', value: 3 },
  { label: 'Brevity', scale: 'Short ←→ Detailed', value: 3 },
  { label: 'Playfulness', scale: 'Serious ←→ Witty', value: 3 },
  { label: 'Encouragement', scale: 'Chill ←→ Hype me up', value: 3 },
  { label: 'Language Style', scale: 'Clean ←→ Slang', value: 3 }
];

const swearingOptions = [
  'No swearing',
  'Light swearing okay',
  'Full expressive language okay',
  'Depends on context'
];

const regionOptions = [
  'No regional tone (default)',
  'Southern U.S.',
  'New York / Northeast',
  'Midwest',
  'West Coast',
  'Pacific Northwest',
  'British (UK – London)',
  'Irish',
  'Australian',
  'Caribbean',
  'Indian English',
  'South African'
];

const defaultRegionalSliders: RegionalSliders = {
  language: 3,
  culture: 3,
  food: 3,
  socialTone: 3
};

export default function ToneSyncSection({ existingData }: { existingData?: ToneSyncData }) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<ToneSyncData>(
    existingData ?? {
      preferences: defaultPreferences,
      swearing: '',
      regionalFeel: {
        region: '',
        autoDetect: false,
        sliders: defaultRegionalSliders
      }
    }
  );

  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const current = form.preferences[step];

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

  const handleSliderChange = (value: number) => {
    setForm((prev) => {
      const updated = [...prev.preferences];
      updated[step].value = value;
      return { ...prev, preferences: updated };
    });
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        tonesync: form
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  const updateRegionalSlider = (key: keyof RegionalSliders, value: number) => {
    setForm((prev) => ({
      ...prev,
      regionalFeel: {
        ...prev.regionalFeel,
        sliders: {
          ...(prev.regionalFeel?.sliders ?? defaultRegionalSliders),
          [key]: value
        }
      }
    }));
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

      {step < form.preferences.length ? (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">{current.label}</label>
          <div className="text-sm text-gray-500 italic mb-1">{current.scale}</div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={current.value}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
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
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Comfort with Swearing</label>
            <select
              className="w-full border p-2 rounded mt-1"
              value={form.swearing || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, swearing: e.target.value }))}
            >
              <option value="">Select one</option>
              {swearingOptions.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <hr className="border-gray-300" />

          <h2 className="text-lg font-semibold text-gray-800">Regional Feel & Dialect</h2>

          <label className="block text-sm font-medium text-gray-700">Pick a Region</label>
          <select
            className="w-full border p-2 rounded"
            value={form.regionalFeel?.region || ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                regionalFeel: {
                  ...prev.regionalFeel,
                  region: e.target.value,
                  sliders: prev.regionalFeel?.sliders || defaultRegionalSliders
                }
              }))
            }
          >
            <option value="">No regional tone (default)</option>
            {regionOptions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>

          {form.regionalFeel?.region && (
            <>
              {(['language', 'culture', 'food', 'socialTone'] as (keyof RegionalSliders)[]).map((key) => (
                <div key={key} className="mt-4">
                  <label className="text-sm font-medium text-gray-700 capitalize">
                    {key} influence
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={form.regionalFeel?.sliders?.[key] ?? 3}
                    onChange={(e) => updateRegionalSlider(key, Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-sm text-right text-gray-600 italic">
                    Level: {form.regionalFeel?.sliders?.[key] ?? 3}
                  </div>
                </div>
              ))}

              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={form.regionalFeel.autoDetect || false}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      regionalFeel: {
                        ...prev.regionalFeel,
                        autoDetect: e.target.checked
                      }
                    }))
                  }
                />
                <label className="text-sm font-medium text-gray-700">
                  Auto-detect region (coming soon)
                </label>
              </div>
            </>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50 mt-6"
          >
            {saving ? 'Saving...' : 'Save and Continue'}
          </button>
        </div>
      )}
    </main>
  );
}