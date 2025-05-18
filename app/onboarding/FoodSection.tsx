'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/utils/supabaseClient';
import { updateFamiliarityScore } from '@/utils/familiarity';

interface FoodData {
  diet?: string[];
  allergies?: string[];
  avoids?: string;
  favorites?: string;
  cookingStyle?: string;
  cookingEnjoyment?: string;
  wantsHelp?: string;
  narrative?: string;
}

interface SectionProps {
  existingData?: FoodData;
}

const intro = `Food says a lot about how you live — from how you eat to how you treat yourself.
This helps me make better suggestions, avoid anything that doesn’t work for you, and even recommend meals, gifts, or experiences you’ll enjoy.`;

const dietOptions = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Dairy-Free',
  'Low-Carb',
  'Keto',
  'Paleo',
  'Mediterranean',
  'Intermittent Fasting',
  'No Restrictions',
  'Other'
];

const allergyExamples = [
  'Nuts',
  'Shellfish',
  'Dairy',
  'Soy',
  'Eggs',
  'Wheat',
  'Sesame',
  'Other'
];

const eatingStyleOptions = [
  'Mostly cook for myself',
  'Partner or family does most of the cooking',
  'I eat out or order in a lot',
  'Mix of everything',
  'It depends'
];

const cookingEnjoymentOptions = [
  'I love it',
  'I can hold my own',
  'I’m still learning',
  'Not really',
  'I’d rather order'
];

const helpPreferenceOptions = [
  'Yes, regularly',
  'Occasionally',
  'Only if I ask',
  'No thanks'
];

export default function FoodSection({ existingData }: SectionProps) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [form, setForm] = useState<FoodData>(existingData || {});
  const [typing, setTyping] = useState('');
  const [showDots, setShowDots] = useState(false);
  const [saving, setSaving] = useState(false);
  const indexRef = useRef(0);

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
    setForm((prev) => {
      const current = prev[key] as string[] | undefined;
      const next = current?.includes(option)
        ? current.filter((o) => o !== option)
        : [...(current || []), option];
      return { ...prev, [key]: next };
    });
  };

  const handleChange = <K extends keyof FoodData>(key: K, value: FoodData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.sub) return;
    setSaving(true);
    await supabase
      .from('vaults_test')
      .upsert({ user_uid: user.sub, food: form }, { onConflict: 'user_uid' });
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

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Do you follow a specific diet or eating style?</label>
        <div className="flex flex-wrap gap-2">
          {dietOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleMultiSelect('diet', option)}
              className={`px-3 py-1 rounded border ${
                form.diet?.includes(option)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-black border-gray-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium text-gray-700">Any allergies or sensitivities?</label>
        <div className="flex flex-wrap gap-2">
          {allergyExamples.map((option) => (
            <button
              key={option}
              onClick={() => handleMultiSelect('allergies', option)}
              className={`px-3 py-1 rounded border ${
                form.allergies?.includes(option)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-black border-gray-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium text-gray-700">Anything you avoid — even if not allergic?</label>
        <textarea
          rows={3}
          className="w-full border p-2 rounded"
          placeholder="e.g. No red meat, dislike mushrooms, avoid caffeine after noon..."
          value={form.avoids || ''}
          onChange={(e) => handleChange('avoids', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Go-to meals, snacks, or drinks?</label>
        <textarea
          rows={3}
          className="w-full border p-2 rounded"
          placeholder="e.g. Coffee with cream every morning, loves sushi, taco night Thursdays..."
          value={form.favorites || ''}
          onChange={(e) => handleChange('favorites', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">How do you typically eat?</label>
        <select
          className="w-full border p-2 rounded"
          value={form.cookingStyle || ''}
          onChange={(e) => handleChange('cookingStyle', e.target.value)}
        >
          <option value="">Select one</option>
          {eatingStyleOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700">Do you enjoy cooking?</label>
        <select
          className="w-full border p-2 rounded"
          value={form.cookingEnjoyment || ''}
          onChange={(e) => handleChange('cookingEnjoyment', e.target.value)}
        >
          <option value="">Select one</option>
          {cookingEnjoymentOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700">Want help with food ideas or planning?</label>
        <select
          className="w-full border p-2 rounded"
          value={form.wantsHelp || ''}
          onChange={(e) => handleChange('wantsHelp', e.target.value)}
        >
          <option value="">Select one</option>
          {helpPreferenceOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-700">Anything else worth noting?</label>
        <textarea
          rows={3}
          className="w-full border p-2 rounded"
          value={form.narrative || ''}
          onChange={(e) => handleChange('narrative', e.target.value)}
        />

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save and Continue'}
        </button>
      </div>
    </main>
  );
}