'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface HealthData {
  generalHealth?: string;
  conditions?: string;
  meds?: string;
  tracker?: string;
  fitnessLevel?: string;
  goals?: string[];
  sleep?: string;
  narrative?: string;
}

interface SectionProps {
  existingData?: HealthData;
}

const intro = `Let’s shift into health and wellness.
You’re not building a medical record — just giving me a sense of how you feel in your body, what you’re managing, and where you might want support.
This helps me guide suggestions, respect your limits, and look out for your goals.`;

const healthLevels = [
  'Excellent',
  'Good',
  'Fair',
  'Challenging',
  'Prefer not to say'
];

const trackers = [
  'Yes (Apple Watch, Fitbit, WHOOP, etc.)',
  'Not currently',
  'I used to',
  'I’m thinking about it',
  'No'
];

const fitnessLevels = [
  'Very active',
  'Somewhat active',
  'Trying to get moving',
  'Limited ability',
  'Prefer not to say'
];

const goalTags = [
  'Lose weight',
  'Gain muscle',
  'Increase energy',
  'Improve mobility',
  'Better sleep',
  'Manage stress',
  'Build routine',
  'Prevent injury',
  'Heal from injury',
  'Other'
];

export default function HealthSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<HealthData>(existingData || {});
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const questions = [
    {
      key: 'generalHealth',
      type: 'dropdown',
      label: 'How would you describe your current state of health?',
      options: healthLevels
    },
    {
      key: 'conditions',
      label: 'Do you have any known conditions, diagnoses, or chronic issues?',
      placeholder: 'e.g., asthma, ADHD, autoimmune, migraines, anxiety…'
    },
    {
      key: 'meds',
      label: 'Are you actively managing any medications, supplements, or treatments?',
      placeholder: 'Medical management (optional)'
    },
    {
      key: 'tracker',
      type: 'dropdown',
      label: 'Do you use a fitness tracker or wearable device?',
      options: trackers
    },
    {
      key: 'fitnessLevel',
      type: 'dropdown',
      label: 'What’s your current relationship with fitness or movement?',
      options: fitnessLevels
    },
    {
      key: 'goals',
      type: 'multi',
      label: 'Do you have any specific goals I can help support?',
      options: goalTags
    },
    {
      key: 'sleep',
      label: 'How’s your sleep, generally speaking?',
      placeholder: 'Quality, routine, challenges — or anything else worth noting.'
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

  const handleMultiSelect = (key: keyof HealthData, option: string) => {
    setForm((prev) => {
      const currentVal = prev[key] as string[] | undefined;
      const next = currentVal?.includes(option)
        ? currentVal.filter((o) => o !== option)
        : [...(currentVal || []), option];
      return { ...prev, [key]: next };
    });
  };

  const handleChange = <K extends keyof HealthData>(key: K, value: HealthData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        health: form
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Medical, Health & Fitness</h1>

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
                  onClick={() => handleMultiSelect(current.key as keyof HealthData, option)}
                  className={`px-3 py-1 rounded border ${
                    (form[current.key as keyof HealthData] as string[])?.includes(option)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-black border-gray-300'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : current.type === 'dropdown' ? (
            <select
              className="w-full border p-2 rounded"
              value={form[current.key as keyof HealthData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof HealthData, e.target.value)
              }
            >
              <option value="">Select one</option>
              {current.options!.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : (
            <textarea
              rows={3}
              className="w-full border p-2 rounded"
              placeholder={current.placeholder || ''}
              value={form[current.key as keyof HealthData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof HealthData, e.target.value)
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
            Anything else I should understand about your health or wellness journey?
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