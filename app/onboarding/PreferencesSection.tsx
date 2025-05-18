'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface PreferencesData {
  energy?: string;
  processing?: string;
  structure?: string;
  depth?: string;
  recharge?: string;
  tonePreferences?: string[];
  narrative?: string;
}

interface SectionProps {
  existingData?: PreferencesData;
}

const intro = `Let’s tune in to your personality and interaction style.
This helps me communicate in a way that mirrors how you think, feel, and recharge.`;

const energyOptions = [
  'Very introverted',
  'Somewhat introverted',
  'Balanced',
  'Somewhat extroverted',
  'Very extroverted'
];

const processingOptions = [
  'Strongly emotional',
  'Emotion-leaning',
  'Balanced',
  'Logic-leaning',
  'Strongly logical'
];

const structureOptions = [
  'Highly structured',
  'Prefer a plan',
  'Flexible',
  'Go with the flow'
];

const depthOptions = [
  'Deep and reflective',
  'Balanced depth',
  'Light and fun',
  'Depends on the moment'
];

const rechargeOptions = [
  'Alone time',
  'Time with close people',
  'Nature / outdoors',
  'Movement / exercise',
  'Stillness and rest',
  'Social energy',
  'Other'
];

const toneTags = [
  'Warm',
  'Direct',
  'Funny',
  'Motivating',
  'Gentle',
  'Challenging',
  'Professional',
  'Playful',
  'Deep',
  'Quick responses',
  'Creative'
];

export default function PreferencesSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<PreferencesData>(existingData || {});
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const questions = [
    {
      key: 'energy',
      type: 'dropdown',
      label: 'How would you describe your social energy or introvert/extrovert lean?',
      options: energyOptions
    },
    {
      key: 'processing',
      type: 'dropdown',
      label: 'Do you tend to be more emotional or logical in how you process things?',
      options: processingOptions
    },
    {
      key: 'structure',
      type: 'dropdown',
      label: 'Do you prefer structure or spontaneity?',
      options: structureOptions
    },
    {
      key: 'depth',
      type: 'dropdown',
      label: 'Do you like deep conversations or light ones?',
      options: depthOptions
    },
    {
      key: 'recharge',
      type: 'dropdown',
      label: 'How do you usually recharge?',
      options: rechargeOptions
    },
    {
      key: 'tonePreferences',
      type: 'multi',
      label: 'What tones or styles do you like in conversation?',
      options: toneTags
    }
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

  const handleMultiSelect = (key: keyof PreferencesData, option: string) => {
    setForm((prev) => {
      const currentVal = prev[key] as string[] | undefined;
      const next = currentVal?.includes(option)
        ? currentVal.filter((o) => o !== option)
        : [...(currentVal || []), option];
      return { ...prev, [key]: next };
    });
  };

  const handleChange = <K extends keyof PreferencesData>(key: K, value: PreferencesData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        preferences: form
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Personality & Preferences</h1>

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
                  onClick={() => handleMultiSelect(current.key as keyof PreferencesData, option)}
                  className={`px-3 py-1 rounded border ${
                    (form[current.key as keyof PreferencesData] as string[])?.includes(option)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-black border-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <select
              className="w-full border p-2 rounded"
              value={form[current.key as keyof PreferencesData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof PreferencesData, e.target.value)
              }
            >
              <option value="">Select one</option>
              {current.options!.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
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
            Anything else you'd like me to know about your style or personality?
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