'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface ToneSyncData {
  preferences: {
    label: string;
    scale: string;
    value: number;
  }[];
  swearing?: string;
  regionalFeel?: {
    region?: string;
    intensity?: number;
  };
}

const intro = `Let’s calibrate how I speak to you.
Some people prefer warmth, others want direct answers.
Some love a little wit — others prefer calm, clear, and focused.
This section tunes my tone to fit your style.`;

const defaultPreferences = [
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

const regions = [
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

const intensityLabels = [
  'Subtle tone (a hint)',
  'Light expression',
  'Moderate inflection + expressions',
  'Noticeable stylization',
  'Strong dialect + metaphors'
];

export default function ToneSyncSection() {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<ToneSyncData>({
    preferences: defaultPreferences,
    swearing: '',
    regionalFeel: {
      region: '',
      intensity: 3
    }
  });

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
    await supabase
      .from('vaults_test')
      .upsert(
        {
          user_uid: user.sub,
          tonesync: {
            preferences: form.preferences,
            swearing: form.swearing,
            regionalFeel: form.regionalFeel
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
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-sm text-right text-gray-600 italic">
            Current: {current.value}
          </div>
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
            <label className="block text-sm font-medium text-gray-700">Comfort with swearing</label>
            <select
              className="w-full border p-2 rounded mt-1"
              value={form.swearing || ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, swearing: e.target.value }))
              }
            >
              <option value="">Select one</option>
              {swearingOptions.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <hr className="border-gray-300" />

          <h2 className="text-lg font-semibold text-gray-800">Regional Feel & Dialect</h2>

          <label className="block text-sm font-medium text-gray-700">Pick a region</label>
          <select
            className="w-full border p-2 rounded"
            value={form.regionalFeel?.region || ''}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                regionalFeel: {
                  ...prev.regionalFeel,
                  region: e.target.value
                }
              }))
            }
          >
            <option value="">Select one</option>
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>

          <label className="block text-sm font-medium text-gray-700 mt-4">How strong?</label>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={form.regionalFeel?.intensity || 3}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                regionalFeel: {
                  ...prev.regionalFeel,
                  intensity: parseInt(e.target.value)
                }
              }))
            }
            className="w-full"
          />
          <div className="text-sm text-right text-gray-600 italic">
            {
              intensityLabels[(form.regionalFeel?.intensity || 3) - 1]
            }
          </div>

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