'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface FoodData {
  diet?: string[];
  favorites?: string;
  avoids?: string;
  allergies?: string[];
  guiltyPleasures?: string;
  drinks?: string;
  cookingStyle?: string;
  cookingEnjoyment?: string;
  wantsHelp?: string;
  narrative?: string;
}

interface SectionProps {
  existingData?: FoodData;
}

const intro = `Food isn’t just fuel — it’s comfort, culture, creativity, and sometimes chaos.
This helps me recommend meals, avoid dealbreakers, and support your preferences with more flavor.`;

const questions = [
  { key: 'diet', type: 'multi', label: 'Do you follow a specific diet or eating style?' },
  {
    key: 'favorites',
    type: 'dropdown',
    label: 'What’s your favorite kind of food?',
    options: [
      'Italian',
      'Mexican',
      'Indian',
      'Japanese',
      'Chinese',
      'Thai',
      'Mediterranean',
      'American comfort food',
      'BBQ',
      'Vegan or plant-based',
      'Seafood',
      'Breakfast foods',
      'Other'
    ]
  },
  { key: 'avoids', type: 'text', label: 'Are there any foods or ingredients you avoid — even if not allergic?' },
  {
    key: 'allergies',
    type: 'multi',
    label: 'Any allergies or sensitivities?',
    options: ['Nuts', 'Shellfish', 'Dairy', 'Soy', 'Eggs', 'Wheat', 'Sesame', 'Other']
  },
  {
    key: 'guiltyPleasures',
    type: 'dropdown',
    label: 'Do you have a guilty pleasure?',
    options: [
      'Chocolate',
      'Ice cream',
      'Cheeseburgers',
      'Pizza',
      'Soda',
      'Fried food',
      'Late-night snacks',
      'Alcohol',
      'None of these',
      'Other'
    ]
  },
  { key: 'drinks', type: 'text', label: 'Favorite drinks or daily go-tos?' },
  {
    key: 'cookingStyle',
    type: 'dropdown',
    label: 'How do you typically eat?',
    options: [
      'Mostly cook for myself',
      'Partner or family does most of the cooking',
      'I eat out or order in a lot',
      'Mix of everything',
      'It depends'
    ]
  },
  {
    key: 'cookingEnjoyment',
    type: 'dropdown',
    label: 'Do you enjoy cooking?',
    options: [
      'I love it',
      'I can hold my own',
      'I’m still learning',
      'Not really',
      'I’d rather order'
    ]
  },
  {
    key: 'wantsHelp',
    type: 'dropdown',
    label: 'Do you want help with food ideas or planning?',
    options: ['Yes, regularly', 'Occasionally', 'Only if I ask', 'No thanks']
  }
];

export default function FoodSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [formData, setFormData] = useState<FoodData>(existingData || {});
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

  const handleMultiSelect = (key: keyof FoodData, option: string) => {
    setFormData((prev) => {
      const currentVal = prev[key] as string[] | undefined;
      const next = currentVal?.includes(option)
        ? currentVal.filter((o) => o !== option)
        : [...(currentVal || []), option];
      return { ...prev, [key]: next };
    });
  };

  const handleChange = <K extends keyof FoodData>(key: K, value: FoodData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, food: formData }, { onConflict: 'user_uid' });
    await updateFamiliarityScore(user.sub);
    router.push('/dashboard');
  };

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Food & Dietary Preferences</h1>

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
          {current.type === 'multi' ? (
            <div className="flex flex-wrap gap-2">
              {current.options!.map((option) => (
                <button
                  key={option}
                  onClick={() => handleMultiSelect(current.key as keyof FoodData, option)}
                  className={`px-3 py-1 rounded border ${
                    (formData[current.key as keyof FoodData] as string[])?.includes(option)
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
              value={formData[current.key as keyof FoodData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof FoodData, e.target.value)
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
              value={formData[current.key as keyof FoodData] || ''}
              onChange={(e) =>
                handleChange(current.key as keyof FoodData, e.target.value)
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
            Anything else about your taste, habits, or needs?
          </label>
          <textarea
            rows={4}
            className="w-full border p-2 rounded"
            value={formData.narrative || ''}
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