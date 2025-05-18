'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface PhysicalData {
  build?: string;
  height?: string;
  weightRange?: string;
  shirtSize?: string;
  pantsSize?: string;
  shoeSize?: string;
  assistiveGear?: string;
  visualNotes?: string;
}

interface SectionProps {
  existingData?: PhysicalData;
}

const intro = `Let’s get a quick snapshot of how you look and move.
This helps me recommend products, personalize responses, and support anything related to comfort, sizing, or accessibility.`;

const questions = [
  {
    key: 'build',
    type: 'dropdown',
    label: 'How would you describe your body type?',
    options: ['Slim', 'Athletic', 'Average', 'Curvy', 'Larger build', 'Other']
  },
  {
    key: 'height',
    label: 'What is your height?',
    placeholder: 'e.g. 5’11” or 180 cm'
  },
  {
    key: 'weightRange',
    type: 'dropdown',
    label: 'What is your weight range?',
    options: ['Under 120 lbs', '120–150 lbs', '150–180 lbs', '180–220 lbs', '220–260 lbs', 'Over 260 lbs', 'Prefer not to say']
  },
  {
    key: 'shirtSize',
    type: 'dropdown',
    label: 'What shirt size do you usually wear?',
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Other']
  },
  {
    key: 'pantsSize',
    label: 'What is your pants size (waist/inseam)?',
    placeholder: 'e.g. 34x30 or 32W 34L'
  },
  {
    key: 'shoeSize',
    label: 'What is your shoe size?',
    placeholder: 'e.g. 10.5 US or 44 EU'
  },
  {
    key: 'assistiveGear',
    label: 'Do you use any assistive gear or support devices?',
    placeholder: 'e.g. glasses, hearing aid, brace, cane, etc.'
  },
  {
    key: 'visualNotes',
    label: 'Anything else visual I should know to personalize experiences?',
    placeholder: 'e.g. tattoos, hairstyle, accessories, posture, visual identity...'
  }
];

export default function PhysicalAttributesSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<PhysicalData>(existingData || {});
  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

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

  const handleChange = <K extends keyof PhysicalData>(key: K, value: PhysicalData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase.from('vaults_test').upsert(
      {
        user_uid: user.sub,
        physical: form
      },
      { onConflict: 'user_uid' }
    );
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Physical Attributes</h1>

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
          {'options' in current && current.type === 'dropdown' ? (
            <select
              className="w-full border p-2 rounded"
              value={form[current.key as keyof PhysicalData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof PhysicalData, e.target.value)
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
              value={form[current.key as keyof PhysicalData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof PhysicalData, e.target.value)
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
            Anything else I should understand about your physical presence or preferences?
          </label>
          <textarea
            rows={4}
            className="w-full border p-2 rounded"
            value={form.visualNotes || ''}
            onChange={(e) => handleChange('visualNotes', e.target.value)}
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