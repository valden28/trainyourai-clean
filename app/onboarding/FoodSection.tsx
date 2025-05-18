'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateFamiliarityScore } from '@/utils/familiarity';
import { getSupabaseClient } from '@/utils/supabaseClient';

interface FoodData {
  favorites?: string;
  dislikes?: string;
  restrictions?: string;
  allergies?: string;
  diningStyle?: string;
  notes?: string;
}

interface SectionProps {
  existingData?: FoodData;
}

const intro = ` Let’s talk about how you eat — your food preferences, restrictions, and favorites.`;

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

  const handleChange = <K extends keyof FoodData>(field: K, value: FoodData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Food & Beverage Preferences</h1>
      <p className="text-sm text-gray-600 mb-6">
        The way you eat says a lot about you. Whether you’re adventurous or selective, plant-based or protein-forward — your dietary patterns help your assistant support recommendations, reservations, gifts, and even social planning.
      </p>

      <div className="min-h-[100px] mb-6">
        {showDots ? (
          <p className="text-base font-medium text-gray-400 animate-pulse">[ • • • ]</p>
        ) : (
          <p className="text-base font-medium whitespace-pre-line leading-relaxed">{typing}</p>
        )}
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Favorite Foods or Cuisines</label>
        <input
          className="w-full border p-2 rounded"
          value={form.favorites || ''}
          onChange={(e) => handleChange('favorites', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Foods You Dislike</label>
        <input
          className="w-full border p-2 rounded"
          value={form.dislikes || ''}
          onChange={(e) => handleChange('dislikes', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Diet or Restrictions</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. vegetarian, keto, halal"
          value={form.restrictions || ''}
          onChange={(e) => handleChange('restrictions', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Allergies</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. peanuts, shellfish"
          value={form.allergies || ''}
          onChange={(e) => handleChange('allergies', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Dining Style or Habits</label>
        <input
          className="w-full border p-2 rounded"
          placeholder="e.g. fast casual, slow meals, takeout, eats late"
          value={form.diningStyle || ''}
          onChange={(e) => handleChange('diningStyle', e.target.value)}
        />

        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          rows={3}
          className="w-full border p-2 rounded"
          value={form.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
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