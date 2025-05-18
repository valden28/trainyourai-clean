'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface IdentityData {
  fullName?: string;
  nickname?: string;
  dob?: string;
  hometown?: string;
  currentLocation?: string;
  birthplace?: string;
  upbringing?: string;
  culture?: string[];
  communication?: string;
  identityMarkers?: string[];
  narrative?: string;
}

interface SectionProps {
  existingData?: IdentityData;
}

const intro = `Let’s lock in the basics — who you are, where you’re from, and how you move through the world.
This helps me speak naturally and respond with the right context — especially when names, dates, or personal tone matter.`;

const upbringingOptions = [
  'Urban', 'Suburban', 'Rural', 'Religious', 'Multicultural', 'Nomadic or moved often', 'Other'
];

const culturalTags = [
  'American', 'Latino / Hispanic', 'Black / African heritage', 'Asian / Pacific Islander',
  'Middle Eastern', 'European', 'Indigenous / Native', 'Mixed / Multicultural', 'Other'
];

const identityTags = [
  'Creative', 'Neurodivergent', 'Immigrant', 'Introvert', 'Extrovert',
  'Queer / LGBTQ+', 'Spiritual', 'Academic', 'Empath', 'Leader', 'Other'
];

const communicationStyles = [
  'Direct and efficient', 'Warm and expressive', 'Visual learner',
  'Bullet points preferred', 'Long-form, reflective', 'Asks a lot of questions', 'Other'
];

export default function IdentitySection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<IdentityData>(existingData || {});
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

  const questions = [
    { key: 'fullName', label: 'What’s your full name?' },
    { key: 'nickname', label: 'Do you go by a nickname or preferred name?' },
    { key: 'dob', label: 'When is your birthday?', type: 'date' },
    { key: 'hometown', label: 'What town or city do you consider your hometown?' },
    { key: 'currentLocation', label: 'Where do you currently live?' },
    { key: 'birthplace', label: 'Where were you born?' },
    { key: 'upbringing', label: 'How would you describe your upbringing or early environment?', type: 'dropdown', options: upbringingOptions },
    { key: 'culture', label: 'What cultural identities do you most connect with?', type: 'multi', options: culturalTags },
    { key: 'identityMarkers', label: 'Are there any identity markers that matter to how you see yourself?', type: 'multi', options: identityTags },
    { key: 'communication', label: 'How do you prefer to communicate or learn?', type: 'dropdown', options: communicationStyles }
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

  const handleMultiSelect = (key: keyof IdentityData, option: string) => {
    setForm((prev) => {
      const currentVal = prev[key] as string[] | undefined;
      const next = currentVal?.includes(option)
        ? currentVal.filter((o) => o !== option)
        : [...(currentVal || []), option];
      return { ...prev, [key]: next };
    });
  };

  const handleChange = <K extends keyof IdentityData>(key: K, value: IdentityData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        innerview: form
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Identity & Background</h1>

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
                  onClick={() => handleMultiSelect(current.key as keyof IdentityData, option)}
                  className={`px-3 py-1 rounded border ${
                    (form[current.key as keyof IdentityData] as string[])?.includes(option)
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
              value={form[current.key as keyof IdentityData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof IdentityData, e.target.value)
              }
            >
              <option value="">Select one</option>
              {current.options!.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : current.type === 'date' ? (
            <input
              type="date"
              className="w-full border p-2 rounded"
              value={form[current.key as keyof IdentityData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof IdentityData, e.target.value)
              }
            />
          ) : (
            <textarea
              rows={3}
              className="w-full border p-2 rounded"
              value={form[current.key as keyof IdentityData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof IdentityData, e.target.value)
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
            Anything else I should understand about your identity or background?
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
            {saving ? 'Saving...' : 'Save and Complete InnerView'}
          </button>
        </div>
      )}
    </main>
  );
}