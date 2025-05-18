'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface BeliefData {
  spiritualIdentity?: string;
  values?: string[];
  causes?: string[];
  politics?: string;
  worldview?: string;
}

interface SectionProps {
  existingData?: BeliefData;
}

const intro = `Now let’s talk about what drives you.
Your values, beliefs, and causes can shape how you make decisions — and how you want to show up in the world.
This helps me align with what matters to you.`;

const spiritualOptions = [
  'Agnostic',
  'Atheist',
  'Christian',
  'Catholic',
  'Jewish',
  'Muslim',
  'Hindu',
  'Buddhist',
  'Spiritual but not religious',
  'Not sure',
  'Prefer not to say',
  'Other'
];

const values = [
  'Honesty', 'Loyalty', 'Independence', 'Kindness', 'Efficiency',
  'Simplicity', 'Ambition', 'Creativity', 'Curiosity', 'Justice', 'Faith', 'Respect', 'Other'
];

const causeTags = [
  'Mental health', 'Education', 'Equity', 'Environment', 'Free speech',
  'Veterans', 'Healthcare access', 'Tech ethics', 'Animal welfare', 'Other'
];

const politics = [
  'Apolitical', 'Liberal', 'Conservative', 'Libertarian',
  'Progressive', 'Moderate / Centrist', 'Independent', 'Other', 'Prefer not to say'
];

export default function BeliefSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<BeliefData>(existingData || {});
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const questions = [
    {
      key: 'spiritualIdentity',
      label: 'Do you identify with a particular religion or spiritual belief system?',
      type: 'dropdown',
      options: spiritualOptions
    },
    {
      key: 'values',
      label: 'What personal values guide your behavior?',
      type: 'multi',
      options: values
    },
    {
      key: 'causes',
      label: 'Are there causes or issues you care deeply about?',
      type: 'multi',
      options: causeTags
    },
    {
      key: 'politics',
      label: 'How would you describe your political stance?',
      type: 'dropdown',
      options: politics
    },
    {
      key: 'worldview',
      label: 'Anything else I should understand about your worldview or operating principles?',
      placeholder: 'Optional — only if it helps frame how you see things.'
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

  const handleMultiSelect = (key: keyof BeliefData, option: string) => {
    setForm((prev) => {
      const currentVal = prev[key] as string[] | undefined;
      const next = currentVal?.includes(option)
        ? currentVal.filter((o) => o !== option)
        : [...(currentVal || []), option];
      return { ...prev, [key]: next };
    });
  };

  const handleChange = <K extends keyof BeliefData>(key: K, value: BeliefData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        beliefs: form
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Beliefs, Values & Operating Principles</h1>

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
                  onClick={() => handleMultiSelect(current.key as keyof BeliefData, option)}
                  className={`px-3 py-1 rounded border ${
                    (form[current.key as keyof BeliefData] as string[])?.includes(option)
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
              value={form[current.key as keyof BeliefData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof BeliefData, e.target.value)
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
              value={form[current.key as keyof BeliefData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof BeliefData, e.target.value)
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
            Anything else I should understand about your beliefs, values, or worldview?
          </label>
          <textarea
            rows={4}
            className="w-full border p-2 rounded"
            value={form.worldview || ''}
            onChange={(e) => handleChange('worldview', e.target.value)}
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